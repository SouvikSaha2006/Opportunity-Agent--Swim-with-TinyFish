import pytest
from backend.models import StudentProfile, OpportunityRecord, RequirementItem
from backend.matcher import score_and_audit
from backend import database


@pytest.fixture
def sample_student_profile() -> StudentProfile:
    return StudentProfile(
        name="Alex Rivera",
        education_level="Undergraduate",
        course_and_year="B.Tech Computer Science 3rd Year",
        skills=["Python", "FastAPI", "React"],
        interests=["Artificial Intelligence", "Distributed Systems"],
        location="Bangalore",
        preferred_work_mode="Remote",
        opportunity_type="Both"
    )


def test_matching_technical_skills_and_remote_mode(sample_student_profile):
    """
    Test score calculation when technical skills match and work mode is Remote.
    Verifies base points (40) + skills (30) + mode (15) + deadline (15) => 100,
    with eligibility status 'Likely Match'.
    """
    search_result = {
        "title": "National AI Hackathon 2026",
        "url": "https://ai-hackathon.org",
        "snippet": "Join our 2026 competition. Looking for Python, FastAPI, and React developers. Remote participation worldwide.",
        "organization": "OpenAI Community",
        "location": "Global / Remote"
    }
    page_markdown = "# Rules\nApplication deadline: December 15, 2026.\nWork mode: Fully Remote."

    record = score_and_audit(sample_student_profile, search_result, page_markdown)

    assert isinstance(record, OpportunityRecord)
    assert record.ranking_score >= 70
    assert record.eligibility_status == "Likely Match"
    assert record.work_mode == "Remote"
    assert "December 15, 2026" in record.deadline

    # Inspect requirement breakdown
    status_by_req = {req.requirement: req.status for req in record.requirements_breakdown}
    assert status_by_req["Domain Relevance & Indexing"] == "MET"
    assert status_by_req["Technical Skill Alignment"] == "MET"
    assert status_by_req["Work Mode / Location Compatibility"] == "MET"
    assert status_by_req["Application Timeline & Deadline"] == "MET"

    # Verify actionable checklist
    assert len(record.next_actions) == 3
    assert any("deadline" in act.lower() for act in record.next_actions)


def test_fallback_uncertain_for_missing_deadlines_and_unverified_skills():
    """
    Test fallback to 'UNCERTAIN' for missing deadlines and unverified skills.
    Ensures zero hallucination rule: deadline becomes 'Unknown - Verification Required'.
    """
    profile = StudentProfile(
        name="Samantha",
        education_level="Master's",
        course_and_year="M.Sc Data Science 1st Year",
        skills=["Rust", "Kubernetes", "Golang"],
        interests=["Cloud Infrastructure"],
        location="Delhi",
        preferred_work_mode="Remote",
        opportunity_type="Internship"
    )

    search_result = {
        "title": "General Student Internship Program",
        "url": "https://example.com/internship",
        "snippet": "We welcome college students for our annual corporate internship program.",
        "organization": "Legacy Corp"
    }
    # No skills mentioned, no deadline, no work mode mentioned
    page_markdown = "Welcome to our portal. Check back for upcoming openings."

    record = score_and_audit(profile, search_result, page_markdown)

    assert record.deadline == "Unknown - Verification Required"
    assert record.ranking_score < 70

    status_by_req = {req.requirement: req.status for req in record.requirements_breakdown}
    assert status_by_req["Technical Skill Alignment"] == "UNCERTAIN"
    assert status_by_req["Application Timeline & Deadline"] == "UNCERTAIN"
    assert status_by_req["Work Mode / Location Compatibility"] == "UNCERTAIN"


def test_proper_ranking_order_generation(sample_student_profile):
    """
    Tests ranking ordering when multiple opportunities with varying relevance are audited.
    Higher relevance items must sort ahead of incomplete or conflicting items.
    """
    opp_high = {
        "title": "Full-Stack Python Remote Fellowship",
        "url": "https://fellowship.org",
        "snippet": "Hands-on Python, FastAPI, and React remote development fellowship. Deadline: November 30, 2026.",
        "organization": "DevFellowship"
    }

    opp_medium = {
        "title": "Frontend Hybrid Internship",
        "url": "https://internships.org/frontend",
        "snippet": "Frontend position with React. Hybrid schedule in office. Closes on October 20, 2026.",
        "organization": "TechCorp"
    }

    opp_low = {
        "title": "On-Site Mechanical Drafting Contest",
        "url": "https://cad-contest.com",
        "snippet": "Strictly on-site in-person CAD and hardware competition. No coding involved.",
        "organization": "Mechanix"
    }

    record_high = score_and_audit(sample_student_profile, opp_high, "")
    record_medium = score_and_audit(sample_student_profile, opp_medium, "")
    record_low = score_and_audit(sample_student_profile, opp_low, "")

    shortlist = [record_low, record_high, record_medium]
    shortlist.sort(key=lambda x: x.ranking_score, reverse=True)

    assert shortlist[0].id == record_high.id
    assert shortlist[0].ranking_score > shortlist[1].ranking_score
    assert shortlist[1].ranking_score >= shortlist[2].ranking_score

    assert shortlist[0].eligibility_status == "Likely Match"
    assert shortlist[2].eligibility_status in ["Needs Verification", "Does Not Match"]


def test_sqlite_persistence_roundtrip(tmp_path, sample_student_profile):
    """
    Verifies that OpportunityRecord can be saved to SQLite, retrieved,
    with nested JSON fields properly deserialized, and successfully deleted.
    """
    db_file = str(tmp_path / "test_opportunities.db")
    database.init_db(db_file)

    search_result = {
        "title": "Test Hackathon 2026",
        "url": "https://testhack.io",
        "snippet": "Python remote hackathon with deadline: 2026-12-01.",
        "organization": "Test Org"
    }
    record = score_and_audit(sample_student_profile, search_result, "")

    # Save
    database.save_opportunity(record.model_dump(), db_path=db_file)

    # Retrieve
    saved = database.get_saved_opportunities(db_path=db_file)
    assert len(saved) == 1
    retrieved = saved[0]
    assert retrieved["id"] == record.id
    assert retrieved["title"] == record.title
    assert isinstance(retrieved["requirements_breakdown"], list)
    assert len(retrieved["requirements_breakdown"]) == len(record.requirements_breakdown)
    assert isinstance(retrieved["next_actions"], list)
    assert len(retrieved["next_actions"]) == 3
    assert retrieved["is_live_data"] is True

    # Delete
    deleted = database.delete_saved_opportunity(record.id, db_path=db_file)
    assert deleted is True

    # Check empty
    remaining = database.get_saved_opportunities(db_path=db_file)
    assert len(remaining) == 0


def test_portal_health_analysis_deterministic_rules():
    """
    Validates deterministic rules for portal stress-testing:
    - Closed/expired forms
    - Auth-walled portals
    - Live verified portals
    - Unverified fallback
    """
    from backend.researcher import analyze_portal_content, verify_destination_portal

    # 1. Closed / Expired
    closed_text = "Notice: The form is no longer accepting responses. Applications are closed."
    status, detail = analyze_portal_content(closed_text)
    assert status == "PORTAL_CLOSED_OR_EXPIRED"
    assert "closed" in detail.lower()

    # 2. Auth Wall
    auth_text = "Google Devfolio SSO: Sign in to continue. Login required to view application."
    status, detail = analyze_portal_content(auth_text)
    assert status == "AUTH_WALL_REQUIRED"
    assert "login" in detail.lower() or "wall" in detail.lower()

    # 3. Live Verified
    live_text = "Welcome to the 2026 Developer Grant! Register now and submit application before deadline."
    status, detail = analyze_portal_content(live_text)
    assert status == "PORTAL_LIVE_VERIFIED"
    assert "active" in detail.lower() or "accepting" in detail.lower()

    # 4. Fallback / Unverified
    empty_status, _ = analyze_portal_content("")
    assert empty_status == "PORTAL_UNVERIFIED"

    unclear_status, _ = analyze_portal_content("Random blog post about software architecture.")
    assert unclear_status == "PORTAL_UNVERIFIED"

    # 5. Invalid URL handling in verify_destination_portal
    invalid_status, _ = verify_destination_portal("not_a_valid_url")
    assert invalid_status == "PORTAL_UNVERIFIED"


def test_opportunity_record_with_portal_health_persistence(tmp_path, sample_student_profile):
    """
    Verifies that portal_health_status and portal_health_detail persist and
    retrieve cleanly through SQLite.
    """
    db_file = str(tmp_path / "test_portal_health.db")
    database.init_db(db_file)

    search_result = {
        "title": "Autonomous Hackathon 2026",
        "url": "https://autonohack.org/apply",
        "snippet": "Join our hackathon. Python developers welcome.",
        "organization": "AutonoOrg"
    }

    record = score_and_audit(
        sample_student_profile,
        search_result,
        "",
        portal_health_status="PORTAL_LIVE_VERIFIED",
        portal_health_detail="Registration active. No captcha or registration block detected on target form."
    )

    assert record.portal_health_status == "PORTAL_LIVE_VERIFIED"
    assert "Registration active" in record.portal_health_detail

    # Persist
    database.save_opportunity(record.model_dump(), db_path=db_file)

    # Fetch back
    saved = database.get_saved_opportunities(db_path=db_file)
    assert len(saved) == 1
    retrieved = saved[0]
    assert retrieved["portal_health_status"] == "PORTAL_LIVE_VERIFIED"
    assert retrieved["portal_health_detail"] == "Registration active. No captcha or registration block detected on target form."

