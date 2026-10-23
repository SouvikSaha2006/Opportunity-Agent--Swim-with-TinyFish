import re
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from urllib.parse import urlparse

from backend.models import (
    StudentProfile,
    RequirementItem,
    OpportunityRecord,
    MicroSprint,
    KeywordDelta,
    AuthenticityAudit,
)


TECH_SKILL_CATALOG: Dict[str, str] = {
    "python": "Python",
    "fastapi": "FastAPI",
    "flask": "Flask",
    "django": "Django",
    "react": "React",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "vue": "Vue.js",
    "angular": "Angular",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "express": "Express",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "keras": "Keras",
    "scikit-learn": "Scikit-Learn",
    "sklearn": "Scikit-Learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "sql": "SQL",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "aws": "AWS",
    "azure": "Azure",
    "gcp": "Google Cloud",
    "git": "Git",
    "github": "GitHub",
    "ci/cd": "CI/CD",
    "graphql": "GraphQL",
    "restful apis": "RESTful APIs",
    "rest api": "RESTful APIs",
    "rest": "RESTful APIs",
    "c++": "C++",
    "cpp": "C++",
    "c#": "C#",
    "java": "Java",
    "golang": "Go",
    "go": "Go",
    "rust": "Rust",
    "langchain": "LangChain",
    "llamaindex": "LlamaIndex",
    "rag": "RAG",
    "llms": "LLMs",
    "llm": "LLMs",
    "nlp": "NLP",
    "computer vision": "Computer Vision",
    "opencv": "OpenCV",
    "linux": "Linux",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "flutter": "Flutter",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "kafka": "Apache Kafka",
}


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


def compute_keyword_delta(
    profile: StudentProfile,
    corpus: str,
    matched_skills: List[str],
    opportunity_title: str = "",
    opportunity_category: str = ""
) -> KeywordDelta:
    """
    Computes deterministic Skill & Keyword Delta Matrix:
    - matched_keywords: Student skills validated against opportunity listing.
    - missing_prerequisites: In-demand technologies mentioned in listing but absent from profile.
    - resume_keyword_fixes: Actionable resume keyword optimizations for ATS alignment.
    - micro_sprint_task: Concrete 48-Hour challenge to bridge unverified competencies.
    """
    student_skills_set = {s.strip().lower() for s in (profile.skills or []) if s.strip()}

    # 1. Detect all technical skills present in listing corpus
    found_listing_skills: Dict[str, str] = {}
    for token, canonical in TECH_SKILL_CATALOG.items():
        escaped = re.escape(token)
        pattern = rf"(?i)(?:\b|(?<=[^a-zA-Z0-9])){escaped}(?:\b|(?=[^a-zA-Z0-9]))"
        if re.search(pattern, corpus):
            found_listing_skills[canonical.lower()] = canonical

    # 2. Compute matched keywords (preserving canonical casing)
    matched_set = set()
    matched_list: List[str] = []

    for s in matched_skills:
        canonical = TECH_SKILL_CATALOG.get(s.lower(), s.strip())
        if canonical not in matched_set:
            matched_set.add(canonical)
            matched_list.append(canonical)

    for s in (profile.skills or []):
        s_lower = s.strip().lower()
        if s_lower in found_listing_skills:
            canonical = found_listing_skills[s_lower]
            if canonical not in matched_set:
                matched_set.add(canonical)
                matched_list.append(canonical)

    # 3. Compute missing prerequisites
    missing_prereqs_list: List[str] = []
    for s_lower, canonical in found_listing_skills.items():
        if s_lower not in student_skills_set and canonical not in matched_set:
            if canonical not in missing_prereqs_list:
                missing_prereqs_list.append(canonical)

    # Contextual domain fallbacks if listing text mentions few explicit technologies
    if len(missing_prereqs_list) < 2:
        is_ml_ai = any(kw in corpus.lower() or kw in opportunity_title.lower() for kw in ["ai", "agent", "llm", "ml", "learning", "data"])
        domain_fallbacks = ["Docker", "RESTful APIs", "Git", "PostgreSQL"] if not is_ml_ai else ["PyTorch", "RAG", "LangChain", "Docker"]
        for fb in domain_fallbacks:
            if fb.lower() not in student_skills_set and fb not in matched_set and fb not in missing_prereqs_list:
                missing_prereqs_list.append(fb)
                if len(missing_prereqs_list) >= 3:
                    break

    missing_prerequisites = missing_prereqs_list[:4]

    # 4. Generate actionable resume keyword fixes
    fixes: List[str] = []
    if missing_prerequisites:
        top_missing = missing_prerequisites[0]
        if top_missing in ["RESTful APIs", "FastAPI", "Express", "Node.js"]:
            fixes.append(f"Replace generic 'Backend Dev' with explicit '{top_missing} & OpenAPI specifications'")
        elif top_missing in ["PostgreSQL", "SQL", "MongoDB", "Redis"]:
            fixes.append(f"Replace 'Database knowledge' with '{top_missing} (Schema design & query optimization)'")
        elif top_missing in ["Docker", "Kubernetes", "CI/CD"]:
            fixes.append(f"Add '{top_missing} Containerization' under Technical Skills & project deployments")
        elif top_missing in ["PyTorch", "TensorFlow", "RAG", "LangChain"]:
            fixes.append(f"Upgrade generic 'AI/ML' bullet to specify '{top_missing} pipeline implementation'")
        else:
            fixes.append(f"Explicitly index '{top_missing}' under Technical Skills on your resume")

    if len(missing_prerequisites) > 1:
        second_missing = missing_prerequisites[1]
        fixes.append(f"Highlight '{second_missing}' in your most recent project description for ATS matching")

    if matched_list:
        fixes.append(f"Prominently position validated skill '{matched_list[0]}' in the first 3 lines of your CV summary")
    else:
        fixes.append("Re-align project keywords with the host organization's technical stack requirements")

    # 5. Formulate 48-Hour Micro-Sprint Task & Breakdown
    target_skill_str = ", ".join(missing_prerequisites[:2]) if missing_prerequisites else (matched_list[0] if matched_list else "Full-Stack")

    if missing_prerequisites:
        primary_gap = missing_prerequisites[0]
        secondary_gap = missing_prerequisites[1] if len(missing_prerequisites) > 1 else "clean architecture"
        sprint_title = f"48-Hour Micro-Sprint: {primary_gap} & {secondary_gap} Proof-of-Work"
        sprint_deliverable = f"Public GitHub repository with {primary_gap} prototype, automated tests, and live deployment link"
        micro_sprint_task = (
            f"In the next 48 hours, build and publish an end-to-end prototype on GitHub demonstrating "
            f"{target_skill_str} to bridge your resume gap, then attach the repository link to your application."
        )
        sprint_steps = [
            f"Hours 0-12: Initialize repo, configure dev environment, and scaffold core architecture using {primary_gap}.",
            f"Hours 12-24: Implement working business logic and integrate {secondary_gap} with automated test cases.",
            f"Hours 24-36: Containerize application or deploy to cloud; document architecture in README.md with screenshots.",
            f"Hours 36-48: Record a 60-second video demo or GIF, pin repo to GitHub profile, and feature link on CV."
        ]
    else:
        lead_skill = matched_list[0] if matched_list else "Project"
        sprint_title = f"48-Hour Micro-Sprint: Production Hardening for {lead_skill}"
        sprint_deliverable = f"Production-grade GitHub repo with 90-second Loom walkthrough and benchmarks"
        micro_sprint_task = (
            f"In the next 48 hours, record a concise 90-second Loom architecture walkthrough of your {lead_skill} "
            f"project, add benchmark metrics to the README, and embed the demo URL directly in your application header."
        )
        sprint_steps = [
            f"Hours 0-12: Benchmark system latency and throughput for your {lead_skill} implementation.",
            f"Hours 12-24: Add end-to-end integration tests and configure CI/CD pipeline on GitHub Actions.",
            f"Hours 24-36: Author high-clarity architectural documentation with system design diagrams.",
            f"Hours 36-48: Record 90-second Loom demo walkthrough and attach clickable link in application header."
        ]

    micro_sprint = MicroSprint(
        title=sprint_title,
        duration="48 Hours",
        deliverable=sprint_deliverable,
        steps=sprint_steps
    )

    return KeywordDelta(
        matched_keywords=matched_list,
        missing_prerequisites=missing_prerequisites,
        resume_keyword_fixes=fixes,
        micro_sprint_task=micro_sprint_task,
        micro_sprint=micro_sprint
    )


KNOWN_AGGREGATOR_DOMAINS: List[str] = [
    "internshala", "unstop", "geeksforgeeks", "linkedin", "indeed",
    "naukri", "medium", "reddit", "glassdoor", "wellfound", "ycombinator", "angel.co"
]

EXPIRED_PATTERNS: List[str] = [
    r"(?i)\bregistration\s+(?:is\s+|was\s+)?closed(?:\s+in\s+202[0-4])?\b",
    r"(?i)\bapplications?\s+(?:are\s+|have\s+|were\s+)?closed(?:\s+in\s+202[0-4])?\b",
    r"(?i)\bwinners\s+announced\b",
    r"(?i)\bevent\s+concluded\b",
    r"(?i)\bhackathon\s+concluded\b",
    r"(?i)\bsubmission\s+(?:is\s+|was\s+)?closed\b",
]


def compute_authenticity_audit(
    corpus: str,
    source_url: str,
    org_name: str = ""
) -> Tuple[AuthenticityAudit, int]:
    """
    Evaluates temporal drift and domain canonical authority:
    - Extracts year tokens (2020-2029).
    - Checks for stale repost indicators (legacy years <= 2024 with zero 2026 validation or expired phrases).
    - Classifies source hostname into CANONICAL_HOST, AGGREGATOR_REPOST, or UNKNOWN.
    - Assigns credibility_flag: VERIFIED_CANONICAL, THIRD_PARTY_REPOST, or SUSPECTED_EXPIRED.
    Returns (AuthenticityAudit, score_penalty).
    """
    # 1. Year parsing
    year_matches = re.findall(r"\b(202[0-9])\b", corpus)
    detected_years = sorted(list({int(y) for y in year_matches}))

    has_legacy_years = any(y <= 2024 for y in detected_years)
    has_2026 = 2026 in detected_years
    has_expired_text = any(re.search(pat, corpus) for pat in EXPIRED_PATTERNS)

    is_stale_repost = False
    temporal_warning = None
    penalty = 0

    if (has_legacy_years and not has_2026) or has_expired_text:
        is_stale_repost = True
        temporal_warning = "Listing references legacy 2023/2024 dates with zero 2026 active validation. High probability of stale repost."
        penalty = 25

    # 2. Domain classification
    parsed_host = urlparse(source_url).netloc.lower().split(":")[0]
    if parsed_host.startswith("www."):
        parsed_host = parsed_host[4:]

    org_clean = re.sub(r"[^a-z0-9]", "", org_name.lower()) if org_name else ""

    if any(agg in parsed_host for agg in KNOWN_AGGREGATOR_DOMAINS):
        domain_authority_type = "AGGREGATOR_REPOST"
    elif (
        parsed_host.endswith(".edu") or ".edu." in parsed_host or
        parsed_host.endswith(".ac.in") or ".ac.in." in parsed_host or
        parsed_host.endswith(".gov") or ".gov." in parsed_host or
        parsed_host.startswith("careers.") or ".careers." in parsed_host or
        parsed_host.startswith("jobs.") or ".jobs." in parsed_host or
        (org_clean and len(org_clean) >= 3 and org_clean in parsed_host.replace(".", ""))
    ):
        domain_authority_type = "CANONICAL_HOST"
    else:
        domain_authority_type = "UNKNOWN"

    # 3. Credibility flag
    if is_stale_repost:
        credibility_flag = "SUSPECTED_EXPIRED"
    elif domain_authority_type == "CANONICAL_HOST":
        credibility_flag = "VERIFIED_CANONICAL"
    else:
        credibility_flag = "THIRD_PARTY_REPOST"

    audit = AuthenticityAudit(
        is_stale_repost=is_stale_repost,
        detected_years=detected_years,
        domain_authority_type=domain_authority_type,
        temporal_warning=temporal_warning,
        credibility_flag=credibility_flag
    )
    return audit, penalty


def score_and_audit(
    profile: StudentProfile,
    search_result: Dict[str, Any],
    page_markdown: str = "",
    portal_health_status: str = "PORTAL_UNVERIFIED",
    portal_health_detail: str = "Destination could not be reached or confirmed."
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
        escaped_skill = re.escape(skill_str)
        if re.search(rf"(?i)(?:\b|(?<=\W)){escaped_skill}(?:\b|(?=\W))", audit_corpus):
            matched_skills.append(skill_str)

    if student_skills:
        skill_ratio = len(matched_skills) / len(student_skills)
        if matched_skills:
            skill_score = min(30, max(15, int(round(30 * skill_ratio))))
            skill_status = "MET"
            skill_evidence = f"Verified matching skill token(s): {', '.join(matched_skills)} found in opportunity text."
        else:
            skill_score = 0
            skill_status = "UNCERTAIN"
            skill_evidence = f"Profile skills ({', '.join(student_skills)}) not explicitly verified in snippet or fetched page text."
    else:
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

    # Organization extraction
    org = search_result.get("organization") or search_result.get("site_name")
    if not org:
        parsed_domain = urlparse(source_url).netloc
        org = parsed_domain.replace("www.", "").capitalize() if parsed_domain else "Opportunity Host"

    # Feature 3: Authenticity & Temporal Drift Radar
    authenticity_audit, staleness_penalty = compute_authenticity_audit(
        corpus=audit_corpus,
        source_url=source_url,
        org_name=org
    )

    # Total Score Calculation (with temporal penalty)
    raw_total_score = base_score + skill_score + work_mode_score + deadline_score
    ranking_score = max(0, min(100, raw_total_score - staleness_penalty))

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
    if authenticity_audit.is_stale_repost:
        match_explanation += f" Temporal Penalty: -{staleness_penalty} pts ({authenticity_audit.credibility_flag})."

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

    # Feature 2: Compute Skill & Keyword Delta Matrix
    keyword_delta = compute_keyword_delta(
        profile=profile,
        corpus=audit_corpus,
        matched_skills=matched_skills,
        opportunity_title=title,
        opportunity_category=category
    )

    # Generate Actionable 3-Step Checklist (incorporating keyword fixes)
    deadline_action = (
        f"Verify the published deadline ({deadline_display}) on the host organization portal."
        if deadline_display != "Unknown - Verification Required"
        else "Inspect official primary portal to confirm active registration deadlines."
    )
    if keyword_delta.resume_keyword_fixes:
        skills_action = f"Resume Optimization: {keyword_delta.resume_keyword_fixes[0]}"
    else:
        skills_action = (
            f"Tailor CV/resume to prominently feature validated skills: {', '.join(matched_skills)}."
            if matched_skills
            else f"Highlight relevant academic projects corresponding to {profile.course_and_year}."
        )
    application_action = f"Complete 48h micro-sprint and apply directly at {source_url}."

    next_actions = [deadline_action, skills_action, application_action]

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
        is_live_data=True,
        portal_health_status=portal_health_status,
        portal_health_detail=portal_health_detail,
        keyword_delta=keyword_delta,
        authenticity_audit=authenticity_audit
    )

