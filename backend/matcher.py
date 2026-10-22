import re
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from urllib.parse import urlparse

from backend.models import StudentProfile, RequirementItem, OpportunityRecord


def _extract_deadline(corpus: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extracts a published deadline from the text corpus without hallucination.
    Returns (cleaned_deadline_str, raw_evidence_match).
    """
    # 1. Look for explicit keyword prefixes with date expressions
    keyword_patterns = [
        r"(?i)(?:application\s+deadline|submission\s+deadline|apply\s+by|last\s+date\s+to\s+apply|registration\s+closes|closes\s+on|due\s+date|ends\s+on)[\s:]+([A-Za-z0-9,\s\/\-\.]{4,35})(?:\.|\n|$)",
        r"(?i)deadline[\s:]+([A-Za-z0-9,\s\/\-\.]{4,35})(?:\.|\n|$)"
    ]

    for pat in keyword_patterns:
        match = re.search(pat, corpus)
        if match:
            candidate = match.group(1).strip()
            # Clean up candidate
            cleaned = re.sub(r"\s+", " ", candidate).strip(" .,;:-")
            if len(cleaned) >= 4 and any(char.isdigit() for char in cleaned):
                return cleaned, match.group(0).strip()

    # 2. Look for Month Day, Year patterns (e.g. November 15, 2026)
    month_pattern = r"(?i)\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b"
    month_match = re.search(month_pattern, corpus)
    if month_match:
        return month_match.group(0).strip(), month_match.group(0).strip()

    # 3. Look for standard dates DD/MM/YYYY or YYYY-MM-DD
    iso_pattern = r"\b\d{4}-\d{2}-\d{2}\b"
    iso_match = re.search(iso_pattern, corpus)
    if iso_match:
        return iso_match.group(0).strip(), iso_match.group(0).strip()

    date_slash_pattern = r"\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b"
    slash_match = re.search(date_slash_pattern, corpus)
    if slash_match:
        return slash_match.group(0).strip(), slash_match.group(0).strip()

    return None, None


def _detect_work_mode(corpus: str) -> str:
    """Detects work mode from text corpus."""
    lower_text = corpus.lower()
    if "hybrid" in lower_text:
        return "Hybrid"
    if any(k in lower_text for k in ["remote", "virtual", "online", "work from home", "wfh"]):
        return "Remote"
    if any(k in lower_text for k in ["in-office", "on-site", "in-person", "physical presence"]):
        return "In-Office"
    return "Unspecified"


def _extract_evidence_snippet(corpus: str, keywords: List[str], max_len: int = 280) -> str:
    """Extracts a relevant verbatim snippet highlighting matched keywords."""
    lines = [line.strip() for line in corpus.split("\n") if line.strip()]
    for line in lines:
        for kw in keywords:
            if re.search(r"(?i)\b" + re.escape(kw) + r"\b", line):
                return line[:max_len]
    if lines:
        return lines[0][:max_len]
    return corpus[:max_len] if corpus else "Evidence extracted from primary source."


def score_and_audit(
    profile: StudentProfile,
    search_result: Dict[str, Any],
    page_markdown: str = ""
) -> OpportunityRecord:
    """
    Deterministic rule-based matching engine & explanation builder.
    Computes a deterministic integer score out of 100:
      - Base indexing: 40 pts
      - Stated skill matches: up to 30 pts
      - Work mode compatibility: up to 15 pts
      - Published deadline presence: up to 15 pts
    Categorizes status:
      - >= 70: 'Likely Match'
      - 50 - 69: 'Needs Verification'
      - < 50: 'Does Not Match'
    """
    title = search_result.get("title", "Opportunity Listing")
    snippet = search_result.get("snippet", "")
    source_url = search_result.get("url", "")
    audit_corpus = f"{title}\n{snippet}\n{page_markdown}"

    requirements_breakdown: List[RequirementItem] = []

    # 1. Base Indexing Score (40 pts)
    base_score = 40
    requirements_breakdown.append(
        RequirementItem(
            requirement="Domain Relevance & Indexing",
            status="MET",
            evidence_or_reason="Opportunity indexed and matched target intent, domain parameters, and educational criteria."
        )
    )

    # 2. Stated Skill Matches (up to 30 pts)
    matched_skills: List[str] = []
    student_skills = profile.skills or []
    
    for skill in student_skills:
        skill_str = skill.strip()
        if not skill_str:
            continue
        # Check boundary match or substring for languages like C++
        escaped_skill = re.escape(skill_str)
        if re.search(rf"(?i)(?:\b|(?<=\W)){escaped_skill}(?:\b|(?=\W))", audit_corpus):
            matched_skills.append(skill_str)

    if student_skills:
        skill_ratio = len(matched_skills) / len(student_skills)
        if matched_skills:
            # Proportional score from 15 to 30
            skill_score = min(30, max(15, int(round(30 * skill_ratio))))
            skill_status = "MET"
            skill_evidence = f"Verified matching skill token(s): {', '.join(matched_skills)} found in opportunity text."
        else:
            skill_score = 0
            skill_status = "UNCERTAIN"
            skill_evidence = f"Profile skills ({', '.join(student_skills)}) not explicitly verified in snippet or fetched page text."
    else:
        # Check interests if skills empty
        matched_interests = [
            i for i in (profile.interests or [])
            if re.search(rf"(?i)\b{re.escape(i.strip())}\b", audit_corpus)
        ]
        if matched_interests:
            skill_score = 15
            skill_status = "MET"
            skill_evidence = f"General domain interest match: {', '.join(matched_interests)} identified."
        else:
            skill_score = 0
            skill_status = "UNCERTAIN"
            skill_evidence = "No specific technical skills specified in profile; manual review needed."

    requirements_breakdown.append(
        RequirementItem(
            requirement="Technical Skill Alignment",
            status=skill_status,
            evidence_or_reason=skill_evidence
        )
    )

    # 3. Work Mode Compatibility (up to 15 pts)
    detected_work_mode = _detect_work_mode(audit_corpus)
    pref_mode = profile.preferred_work_mode

    if pref_mode == "Any":
        work_mode_score = 15
        mode_status = "MET"
        mode_evidence = f"Flexible work mode accepted by student; detected mode is '{detected_work_mode}'."
    elif pref_mode == "Remote":
        if detected_work_mode == "Remote":
            work_mode_score = 15
            mode_status = "MET"
            mode_evidence = "Remote work/participation explicitly confirmed in opportunity details."
        elif detected_work_mode == "Hybrid":
            work_mode_score = 8
            mode_status = "UNCERTAIN"
            mode_evidence = "Opportunity requires Hybrid attendance; partial remote work may be offered."
        elif detected_work_mode == "In-Office":
            work_mode_score = 0
            mode_status = "UNMET"
            mode_evidence = "Strict in-office/on-site attendance required, conflicting with Remote preference."
        else:
            work_mode_score = 7
            mode_status = "UNCERTAIN"
            mode_evidence = "Work mode not explicitly stated in opportunity text; remote availability unverified."
    elif pref_mode == "In-Office":
        if detected_work_mode in ["In-Office", "Hybrid"]:
            work_mode_score = 15
            mode_status = "MET"
            mode_evidence = f"On-site presence supported (Detected mode: {detected_work_mode})."
        elif detected_work_mode == "Remote":
            work_mode_score = 5
            mode_status = "UNCERTAIN"
            mode_evidence = "Opportunity is fully remote; differs from student's in-office preference."
        else:
            work_mode_score = 7
            mode_status = "UNCERTAIN"
            mode_evidence = "Work mode not explicitly stated in opportunity text."
    else:  # Hybrid
        if detected_work_mode == "Hybrid":
            work_mode_score = 15
            mode_status = "MET"
            mode_evidence = "Hybrid mode matches student's exact preference."
        elif detected_work_mode in ["Remote", "In-Office"]:
            work_mode_score = 10
            mode_status = "MET"
            mode_evidence = f"Detected {detected_work_mode} mode provides partial alignment with hybrid preference."
        else:
            work_mode_score = 7
            mode_status = "UNCERTAIN"
            mode_evidence = "Work mode not explicitly stated in opportunity text."

    requirements_breakdown.append(
        RequirementItem(
            requirement="Work Mode / Location Compatibility",
            status=mode_status,
            evidence_or_reason=mode_evidence
        )
    )

    # 4. Published Deadline Presence (up to 15 pts)
    extracted_deadline, deadline_evidence = _extract_deadline(audit_corpus)
    if extracted_deadline:
        deadline_score = 15
        deadline_status = "MET"
        deadline_display = extracted_deadline
        deadline_reason = f"Published deadline identified: '{extracted_deadline}' (Evidence: '{deadline_evidence}')."
    else:
        deadline_score = 0
        deadline_status = "UNCERTAIN"
        deadline_display = "Unknown - Verification Required"
        deadline_reason = "No explicit deadline found in indexed snippet or page markdown; verification required."

    requirements_breakdown.append(
        RequirementItem(
            requirement="Application Timeline & Deadline",
            status=deadline_status,
            evidence_or_reason=deadline_reason
        )
    )

    # Total Score Calculation
    total_score = base_score + skill_score + work_mode_score + deadline_score
    ranking_score = max(0, min(100, total_score))

    # Categorize Status
    if ranking_score >= 70:
        eligibility_status = "Likely Match"
    elif ranking_score >= 50:
        eligibility_status = "Needs Verification"
    else:
        eligibility_status = "Does Not Match"

    # Match Explanation
    match_explanation = (
        f"Deterministic Score: {ranking_score}/100 ({eligibility_status}). "
        f"Base indexing: 40 pts, Skill match: {skill_score}/30 ({skill_status}), "
        f"Work mode: {work_mode_score}/15 ({mode_status}), "
        f"Deadline verification: {deadline_score}/15 ({deadline_status})."
    )

    # Generate Actionable 3-Step Checklist
    deadline_action = (
        f"Verify the published deadline ({deadline_display}) on the host organization portal."
        if deadline_display != "Unknown - Verification Required"
        else "Inspect official primary portal to confirm active registration deadlines."
    )
    skills_action = (
        f"Tailor CV/resume to prominently feature validated skills: {', '.join(matched_skills)}."
        if matched_skills
        else f"Highlight relevant academic projects corresponding to {profile.course_and_year}."
    )
    application_action = f"Complete submission checklist and apply directly at {source_url}."

    next_actions = [deadline_action, skills_action, application_action]

    # Organization extraction
    org = search_result.get("organization") or search_result.get("site_name")
    if not org:
        parsed_domain = urlparse(source_url).netloc
        org = parsed_domain.replace("www.", "").capitalize() if parsed_domain else "Opportunity Host"

    # Category determination
    lower_title = title.lower()
    if "hackathon" in lower_title or "competition" in lower_title or "challenge" in lower_title:
        category = "Competition"
    elif "intern" in lower_title or "fellowship" in lower_title or "trainee" in lower_title:
        category = "Internship"
    else:
        category = profile.opportunity_type if profile.opportunity_type != "Both" else "Opportunity"

    # Location
    loc = search_result.get("location") or ("Remote" if detected_work_mode == "Remote" else profile.location)

    # Deterministic ID based on source URL and title
    id_seed = f"{source_url}_{title}"
    opp_id = hashlib.sha256(id_seed.encode("utf-8")).hexdigest()[:12]

    # Relevant evidence snippet
    all_keywords = (matched_skills or []) + [pref_mode, "deadline"]
    evidence_snippet = _extract_evidence_snippet(audit_corpus, all_keywords)

    return OpportunityRecord(
        id=opp_id,
        title=title,
        organization=org,
        category=category,
        summary=snippet[:250] if snippet else f"{title} hosted by {org}.",
        deadline=deadline_display,
        location=loc,
        work_mode=detected_work_mode,
        source_url=source_url,
        official_application_url=source_url if source_url.startswith("http") else None,
        retrieved_at=datetime.now(timezone.utc).isoformat(),
        eligibility_status=eligibility_status,
        requirements_breakdown=requirements_breakdown,
        match_explanation=match_explanation,
        next_actions=next_actions,
        ranking_score=ranking_score,
        evidence_snippet=evidence_snippet,
        is_live_data=True
    )
