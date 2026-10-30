import io
import pytest
from fastapi import UploadFile, HTTPException

from backend.app import parse_resume_endpoint
from backend.resume_parser import (
    extract_candidate_name,
    extract_education_level,
    extract_course_and_year,
    extract_technical_skills,
    extract_domains_and_interests,
    extract_experience_level,
    parse_resume_text,
    parse_resume_pdf
)


def _unwrap(coro):
    """Executes a non-awaiting coroutine directly and returns its value."""
    try:
        coro.send(None)
    except StopIteration as e:
        return e.value
    raise RuntimeError("Coroutine did not yield immediate result")


def _build_test_pdf_bytes(text_lines: list[str]) -> bytes:
    """
    Creates a minimal valid PDF in-memory containing text objects using pypdf.
    """
    content_stream = "BT /F1 12 Tf 16 TL 72 712 Td (" + ") Tj T* (".join(text_lines) + ") Tj ET"
    stream_len = len(content_stream.encode("latin-1"))

    pdf_template = (
        b"%PDF-1.4\n"
        b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
        b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
        b"3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj\n"
        b"4 0 obj <</Length " + str(stream_len).encode("ascii") + b">> stream\n" +
        content_stream.encode("latin-1") + b"\nendstream\nendobj\n"
        b"5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
        b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000242 00000 n \n"
        b"trailer <</Size 6 /Root 1 0 R>>\nstartxref\n350\n%%EOF"
    )
    return pdf_template


@pytest.fixture
def sample_resume_text() -> str:
    return """
Priya Nair
Bengaluru, India | priya.nair@example.com | https://github.com/priyanair
SUMMARY
Passionate software engineer building web applications and autonomous AI agents.
EDUCATION
B.Tech in Computer Science and Engineering, 3rd Year
SKILLS
Languages & Frameworks: Python, FastAPI, TypeScript, React, Next.js, Node.js, PyTorch
Databases & Cloud: PostgreSQL, Docker, Kubernetes, Git, Redis, AWS
EXPERIENCE & PROJECTS
- Built autonomous web scraper using TinyFish agents and LLMs
- Won Top 3 at National Student Hackathon 2025
- Contributed to open source machine learning repositories
PREFERENCE
Open to Remote or Hybrid internships and hackathon competitions.
"""


def test_extract_candidate_name_and_contact():
    text = "Rohan Varma\nrohan@example.com\nB.Tech CSE\nPython, Docker"
    name = extract_candidate_name(text, "Rohan_Varma_Resume.pdf")
    assert name == "Rohan Varma"

    text_with_prefix = "Name: Ananya Deshmukh\nEmail: ananya@test.com"
    name_pref = extract_candidate_name(text_with_prefix)
    assert name_pref == "Ananya Deshmukh"

    fallback_from_file = extract_candidate_name("", "Arjun_Sharma_CV.pdf")
    assert fallback_from_file == "Arjun Sharma"


def test_extract_education_and_course(sample_resume_text):
    edu_level = extract_education_level(sample_resume_text)
    assert edu_level == "Undergraduate"

    course = extract_course_and_year(sample_resume_text)
    assert "B.Tech CSE" in course or "Computer Science" in course
    assert "3rd Year" in course

    master_text = "Master of Science in Artificial Intelligence, 1st Year\nM.Tech AI & Robotics"
    assert extract_education_level(master_text) == "Master's"


def test_extract_technical_skills(sample_resume_text):
    skills = extract_technical_skills(sample_resume_text)
    assert "Python" in skills
    assert "FastAPI" in skills
    assert "React" in skills
    assert "TypeScript" in skills
    assert "Docker" in skills
    assert "PostgreSQL" in skills
    assert "PyTorch" in skills
    assert "AWS" in skills
    assert len(skills) >= 8


def test_extract_domains_and_experience(sample_resume_text):
    skills = extract_technical_skills(sample_resume_text)
    domains = extract_domains_and_interests(sample_resume_text, skills)
    assert any("AI" in d or "Agent" in d for d in domains)
    assert any("Full-Stack" in d or "Web" in d for d in domains)

    exp_level = extract_experience_level(sample_resume_text)
    assert "Student" in exp_level or "Entry" in exp_level

    senior_text = "Principal Architect with 8+ years of experience leading distributed systems."
    assert extract_experience_level(senior_text) == "Senior Engineer"


def test_parse_resume_text_roundtrip(sample_resume_text):
    parsed = parse_resume_text(sample_resume_text, "Priya_Nair_Resume.pdf")
    assert parsed["success"] is True
    assert parsed["profile"]["name"] == "Priya Nair"
    assert parsed["profile"]["education_level"] == "Undergraduate"
    assert len(parsed["profile"]["skills"]) >= 8
    assert parsed["experience_level"] == "Student / Entry Level"
    assert parsed["email"] == "priya.nair@example.com"


def test_parse_resume_pdf_extraction():
    lines = [
        "Vikram Patel",
        "vikram@test.org",
        "B.Tech Computer Science 4th Year",
        "Skills: Python, FastAPI, React, Docker, Kubernetes, PostgreSQL",
        "Interests: Hackathons, AI Agents, Cloud Systems",
        "Location: Remote",
    ]
    pdf_bytes = _build_test_pdf_bytes(lines)

    parsed = parse_resume_pdf(pdf_bytes, "Vikram_Patel_Resume.pdf")
    assert parsed["success"] is True
    assert "Vikram" in parsed["profile"]["name"]
    assert "Python" in parsed["profile"]["skills"]
    assert "FastAPI" in parsed["profile"]["skills"]
    assert "Docker" in parsed["profile"]["skills"]


def test_parse_resume_api_endpoint_success():
    lines = [
        "Neha Gupta",
        "neha@domain.com",
        "B.Tech CSE 3rd Year",
        "Skills: Python, React, PyTorch, SQL, Git",
        "Interests: Hackathons, Machine Learning",
    ]
    pdf_bytes = _build_test_pdf_bytes(lines)
    file = UploadFile(filename="Neha_Gupta_Resume.pdf", file=io.BytesIO(pdf_bytes))

    data = _unwrap(parse_resume_endpoint(file=file))
    assert data["success"] is True
    assert "Neha" in data["profile"]["name"]
    assert data["profile"]["education_level"] == "Undergraduate"
    assert "Python" in data["profile"]["skills"]
    assert data["detected_skills_count"] >= 4


def test_parse_resume_api_non_pdf_rejection():
    file = UploadFile(filename="resume.docx", file=io.BytesIO(b"dummy word content"))
    with pytest.raises(HTTPException) as excinfo:
        _unwrap(parse_resume_endpoint(file=file))
    assert excinfo.value.status_code == 400
    assert "Only PDF documents are supported" in excinfo.value.detail


def test_parse_resume_api_empty_file_rejection():
    file = UploadFile(filename="empty.pdf", file=io.BytesIO(b""))
    with pytest.raises(HTTPException) as excinfo:
        _unwrap(parse_resume_endpoint(file=file))
    assert excinfo.value.status_code == 400
