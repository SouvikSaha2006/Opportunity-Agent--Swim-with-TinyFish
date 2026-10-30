import io
import re
from typing import Dict, Any, List, Optional, Tuple
import pypdf

from backend.models import StudentProfile


# Extended Technical Skill Catalog for Resume Extraction
RESUME_SKILL_CATALOG: Dict[str, str] = {
    # Programming Languages
    r"\bpython\b": "Python",
    r"\btypescript\b": "TypeScript",
    r"\bjavascript\b": "JavaScript",
    r"\b(c\+\+|cpp)\b": "C++",
    r"\b(golang|go\s+lang)\b|\b(?<![a-zA-Z0-9])go(?![a-zA-Z0-9])": "Go",
    r"\brust\b": "Rust",
    r"\bjava\b": "Java",
    r"\bc#\b|\bcsharp\b": "C#",
    r"\bphp\b": "PHP",
    r"\bruby\b": "Ruby",
    r"\bkotlin\b": "Kotlin",
    r"\bswift\b": "Swift",
    r"\bdart\b": "Dart",
    r"\br(?:\s+programming|\s+language)?\b": "R",
    r"\bsql\b": "SQL",
    r"\bhtml5?\b": "HTML",
    r"\bcss3?\b": "CSS",
    r"\bbash\b|\bshell\s+scripting\b": "Bash",

    # Web & Full-Stack Frameworks
    r"\b(fastapi|fast-api)\b": "FastAPI",
    r"\bflask\b": "Flask",
    r"\bdjango\b": "Django",
    r"\breact(?:\.js)?\b": "React",
    r"\bnext(?:\.js|js)\b": "Next.js",
    r"\bvue(?:\.js|js)?\b": "Vue.js",
    r"\bangular(?:\.js)?\b": "Angular",
    r"\bnode(?:\.js|js)?\b": "Node.js",
    r"\bexpress(?:\.js)?\b": "Express",
    r"\bspring\s*boot\b": "Spring Boot",
    r"\btailwind(?:\s*css)?\b": "Tailwind CSS",
    r"\bbootstrap\b": "Bootstrap",
    r"\bflutter\b": "Flutter",
    r"\breact\s+native\b": "React Native",

    # AI, ML & Data Science
    r"\b(pytorch|torch)\b": "PyTorch",
    r"\btensorflow\b": "TensorFlow",
    r"\bkeras\b": "Keras",
    r"\b(scikit-learn|sklearn)\b": "Scikit-Learn",
    r"\bpandas\b": "Pandas",
    r"\bnumpy\b": "NumPy",
    r"\bopencv\b": "OpenCV",
    r"\blangchain\b": "LangChain",
    r"\bllamaindex\b": "LlamaIndex",
    r"\b(rag|retrieval[- ]augmented\s+generation)\b": "RAG",
    r"\b(llms?|large\s+language\s+models?)\b": "LLMs",
    r"\bgenerative\s+ai\b|\bgenai\b": "Generative AI",
    r"\b(nlp|natural\s+language\s+processing)\b": "NLP",
    r"\bcomputer\s+vision\b": "Computer Vision",
    r"\bhugging\s*face\b|\btransformers\b": "Hugging Face",

    # Cloud, DevOps & Databases
    r"\bdocker\b|\bdockerfile\b": "Docker",
    r"\b(kubernetes|k8s)\b": "Kubernetes",
    r"\b(aws|amazon\s+web\s+services)\b": "AWS",
    r"\b(azure|microsoft\s+azure)\b": "Azure",
    r"\b(gcp|google\s+cloud)\b": "Google Cloud",
    r"\blinux\b|\bubuntu\b": "Linux",
    r"\bgit\b": "Git",
    r"\bgithub\b": "GitHub",
    r"\bgitlab\b": "GitLab",
    r"\bci\/cd\b|\bgithub\s+actions\b": "CI/CD",
    r"\b(kafka|apache\s+kafka)\b": "Apache Kafka",
    r"\bredis\b": "Redis",
    r"\b(postgresql|postgres)\b": "PostgreSQL",
    r"\bmongodb\b|\bmongo\b": "MongoDB",
    r"\bmysql\b": "MySQL",
    r"\bsqlite\b": "SQLite",
    r"\bgraphql\b": "GraphQL",
    r"\b(restful\s+apis?|rest\s+api|rest\s+apis?)\b": "RESTful APIs",
    r"\belasticsearch\b": "Elasticsearch",
    r"\bterraform\b": "Terraform",
    r"\bsupabase\b": "Supabase",
    r"\bfirebase\b": "Firebase",
    r"\bvector\s+databases?\b|\bpinecone\b|\bchromadb\b": "Vector Databases",
    r"\bmicroservices\b": "Microservices",
    r"\bsystem\s+design\b": "System Design",
}


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts raw text from a PDF byte buffer using pypdf.
    Handles multi-page documents and normalizes whitespace.
    """
    if not pdf_bytes or len(pdf_bytes) == 0:
        raise ValueError("The uploaded file is empty (0 bytes).")

    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    except Exception as e:
        raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")

    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception:
            raise ValueError("Uploaded PDF is password-protected and cannot be parsed.")

    page_texts: List[str] = []
    for page_idx, page in enumerate(reader.pages):
        try:
            text = page.extract_text()
            if text:
                page_texts.append(text)
        except Exception as e:
            # Continue extracting remaining pages if one page fails
            continue

    full_text = "\n\n".join(page_texts).strip()

    # Clean non-printable/null characters
    full_text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", full_text)

    if len(full_text.strip()) < 15:
        raise ValueError(
            "Could not extract readable text from PDF. "
            "The document may be an image-only scan or contains non-extractable text."
        )

    return full_text


def extract_candidate_name(text: str, filename: Optional[str] = None) -> str:
    """
    Extracts the candidate's full name using heuristics:
    1. Explicit 'Name: ...' prefixes.
    2. Header lines (first 5-8 lines) matching title-cased name patterns.
    3. Filename fallback (e.g. 'Arjun_Sharma_Resume.pdf' -> 'Arjun Sharma').
    """
    # 1. Explicit regex for 'Name:' prefix
    name_match = re.search(r"(?i)\b(?:name|candidate|applicant)[\t :]+([A-Za-z\.\'-]+(?:[ \t]+[A-Za-z\.\'-]+){1,3})", text)
    if name_match:
        cand = name_match.group(1).strip()
        cand = re.sub(r"[ \t]+", " ", cand)
        if len(cand.split()) >= 2:
            return cand.title()

    # 2. Inspect first 10 non-empty lines
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    disallowed_keywords = {
        "resume", "curriculum vitae", "cv", "contact", "education", "experience",
        "skills", "projects", "summary", "profile", "objective", "about me",
        "portfolio", "github", "linkedin", "email", "phone", "address", "page"
    }

    for line in lines[:8]:
        cleaned = re.sub(r"[^a-zA-Z\s\.\'-]", "", line).strip()
        cleaned_lower = cleaned.lower()

        # Check if line contains contact info or headers
        if any(kw in cleaned_lower for kw in disallowed_keywords):
            continue
        if "@" in line or "http" in line or re.search(r"\d{5,}", line):
            continue

        words = cleaned.split()
        if 2 <= len(words) <= 4:
            # Validate words start with uppercase and look like name tokens
            if all(w[0].isupper() and w.isalpha() and len(w) >= 2 for w in words):
                return " ".join(words)

    # 3. Filename heuristics
    if filename:
        clean_name = re.sub(r"(?i)(?:resume|cv|_|\-|\.pdf)", " ", filename).strip()
        clean_name = re.sub(r"\s+", " ", clean_name)
        parts = clean_name.split()
        if 2 <= len(parts) <= 3 and all(p.isalpha() for p in parts):
            return clean_name.title()

    return "Student"


def extract_education_level(text: str) -> str:
    """
    Determines candidate's academic tier.
    """
    lower = text.lower()
    if re.search(r"(?i)\b(ph\.?d|doctorate|doctoral)\b", lower):
        return "PhD"
    if re.search(r"(?i)\b(master(?:'?s)?|m\.?tech|m\.?s\b|msc|m\.?sc|mca|mba|postgraduate)\b", lower):
        return "Master's"
    if re.search(r"(?i)\b(high\s*school|secondary\s*school|12th|senior\s*secondary)\b", lower) and not re.search(r"(?i)\b(b\.?tech|b\.?e\b|bachelor)\b", lower):
        return "High School"
    return "Undergraduate"


def extract_course_and_year(text: str) -> str:
    """
    Extracts course of study and academic standing / graduation year.
    """
    lower = text.lower()

    # Detect major / degree
    degree = "B.Tech Computer Science"
    if re.search(r"(?i)\b(b\.?tech(?:\s+in)?\s+(?:cse|computer\s+science(?:(?:\s+and|\s*&)?\s+engineering)?))\b", text):
        degree = "B.Tech CSE"
    elif re.search(r"(?i)\b(b\.?tech(?:\s+in)?\s+(?:it|information\s+technology))\b", text):
        degree = "B.Tech IT"
    elif re.search(r"(?i)\b(b\.?tech(?:\s+in)?\s+(?:ai|artificial\s+intelligence|data\s+science))\b", text):
        degree = "B.Tech AI & Data Science"
    elif re.search(r"(?i)\b(b\.?tech(?:\s+in)?\s+(?:ece|electronics))\b", text):
        degree = "B.Tech ECE"
    elif re.search(r"(?i)\b(m\.?tech|m\.?s\b)\s+(?:in\s+)?(?:computer\s+science|ai|data\s+science)?", text):
        degree = "M.Tech Computer Science"
    elif re.search(r"(?i)\b(bca|mca)\b", text):
        degree = "BCA / MCA"
    elif re.search(r"(?i)\b(b\.?sc|bachelor\s+of\s+science)\b", text):
        degree = "B.Sc Computer Science"

    # Detect standing / year
    year_str = "3rd Year"
    standing_match = re.search(r"(?i)\b(1st|2nd|3rd|4th|final)\s+year\b", text)
    if standing_match:
        year_str = f"{standing_match.group(1).capitalize()} Year"
    else:
        batch_match = re.search(r"(?i)\b(?:batch\s+of|class\s+of|graduating\s+in)\s+(202[4-9])\b", text)
        if batch_match:
            year_str = f"Class of {batch_match.group(1)}"
        else:
            span_match = re.search(r"\b(202[0-9]\s*[-–—]\s*202[4-9])\b", text)
            if span_match:
                year_str = f"({span_match.group(1).replace(' ', '')})"

    return f"{degree}, {year_str}"


def extract_technical_skills(text: str) -> List[str]:
    """
    Identifies technical skills mentioned in the resume using regex token mapping.
    Preserves canonical casing and removes duplicates.
    """
    detected_skills: List[str] = []
    seen: set = set()

    for pattern, canonical in RESUME_SKILL_CATALOG.items():
        if re.search(pattern, text, re.IGNORECASE):
            if canonical not in seen:
                seen.add(canonical)
                detected_skills.append(canonical)

    if not detected_skills:
        detected_skills = ["Python", "FastAPI", "React", "SQL"]

    return detected_skills


def extract_domains_and_interests(text: str, skills: List[str]) -> List[str]:
    """
    Determines domains of interest from resume text and extracted skills.
    """
    lower = text.lower()
    interests: List[str] = []

    domain_rules = [
        (
            ["agent", "autonomous", "tinyfish", "multi-agent", "autogen", "crewai", "langchain"],
            "AI Agents & Autonomous Systems"
        ),
        (
            ["llm", "generative ai", "rag", "transformers", "hugging face", "prompt engineering", "openai"],
            "Generative AI & LLMs"
        ),
        (
            ["machine learning", "deep learning", "neural network", "computer vision", "nlp", "pytorch", "tensorflow"],
            "Machine Learning & AI"
        ),
        (
            ["full stack", "fullstack", "react", "next.js", "frontend", "backend", "web development", "fastapi"],
            "Full-Stack Web Development"
        ),
        (
            ["cloud", "kubernetes", "docker", "devops", "aws", "gcp", "azure", "distributed systems", "ci/cd"],
            "Cloud Systems & DevOps"
        ),
        (
            ["open source", "gsoc", "contributor", "github", "oss"],
            "Open Source & Fellowships"
        ),
        (
            ["hackathon", "hack", "competitive programming", "codeforces", "leetcode", "contest", "winner"],
            "Hackathons & Rapid Prototyping"
        ),
        (
            ["security", "cybersecurity", "ctf", "cryptography", "infosec", "penetration testing"],
            "Cybersecurity & CTFs"
        ),
        (
            ["data science", "data analytics", "pandas", "tableau", "bi", "data engineering"],
            "Data Science & Analytics"
        ),
        (
            ["fintech", "blockchain", "smart contract", "web3", "ethereum", "solidity"],
            "FinTech & Web3"
        ),
    ]

    for keywords, domain_label in domain_rules:
        if any(kw in lower for kw in keywords):
            interests.append(domain_label)

    if not interests:
        interests = ["AI Agents & Autonomous Systems", "Hackathons & Competitions", "Full-Stack Web Development"]

    return interests[:4]


def extract_experience_level(text: str) -> str:
    """
    Classifies candidate experience level based on detected years of experience and keywords.
    """
    lower = text.lower()

    # Look for explicit years of experience
    exp_matches = re.findall(r"(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience", lower)
    if exp_matches:
        years = max(int(m) for m in exp_matches)
        if years >= 5:
            return "Senior Engineer"
        elif years >= 2:
            return "Mid-Level Engineer"
        elif years >= 1:
            return "Junior Engineer"

    if re.search(r"(?i)\b(senior|lead|principal|staff)\b", lower):
        return "Senior Engineer"
    if re.search(r"(?i)\b(mid-level|associate)\b", lower):
        return "Mid-Level Engineer"
    if re.search(r"(?i)\b(junior|entry[- ]level)\b", lower):
        return "Junior Engineer"

    return "Student / Entry Level"


def extract_location(text: str) -> str:
    """
    Extracts location or country from resume text.
    """
    lower = text.lower()
    locations = [
        ("bangalore", "Bangalore, India"),
        ("bengaluru", "Bengaluru, India"),
        ("delhi", "Delhi NCR, India"),
        ("mumbai", "Mumbai, India"),
        ("hyderabad", "Hyderabad, India"),
        ("pune", "Pune, India"),
        ("chennai", "Chennai, India"),
        ("noida", "Noida, India"),
        ("gurgaon", "Gurgaon, India"),
        ("kolkata", "Kolkata, India"),
        ("india", "India"),
        ("san francisco", "San Francisco, USA"),
        ("new york", "New York, USA"),
        ("london", "London, UK"),
        ("remote", "Remote / Global"),
    ]

    for token, loc_name in locations:
        if re.search(rf"(?i)\b{token}\b", lower):
            return loc_name

    return "India / Remote"


def extract_work_mode(text: str) -> str:
    """
    Extracts preferred work mode (Remote, In-Office, Hybrid, Any).
    """
    lower = text.lower()
    if re.search(r"(?i)\b(remote\s+only|open\s+to\s+remote|remote\s+worker|prefers?\s+remote)\b", lower):
        return "Remote"
    if re.search(r"(?i)\b(hybrid)\b", lower):
        return "Hybrid"
    if re.search(r"(?i)\b(in-office|on-site|onsite)\b", lower):
        return "In-Office"
    return "Remote"


def extract_opportunity_type(text: str) -> str:
    """
    Determines preferred opportunity type (Competition, Internship, Both).
    """
    lower = text.lower()
    has_hackathons = bool(re.search(r"(?i)\b(hackathon|competition|contest|hack|ctf)\b", lower))
    has_internship = bool(re.search(r"(?i)\b(internship|fellowship|grant|job|trainee)\b", lower))

    if has_hackathons and not has_internship:
        return "Competition"
    if has_internship and not has_hackathons:
        return "Internship"
    return "Both"


def parse_resume_text(text: str, filename: Optional[str] = None) -> Dict[str, Any]:
    """
    Parses resume text into a structured StudentProfile and additional candidate metadata.
    """
    name = extract_candidate_name(text, filename)
    education_level = extract_education_level(text)
    course_and_year = extract_course_and_year(text)
    skills = extract_technical_skills(text)
    interests = extract_domains_and_interests(text, skills)
    location = extract_location(text)
    work_mode = extract_work_mode(text)
    opp_type = extract_opportunity_type(text)
    experience_level = extract_experience_level(text)

    # Email and phone extraction for extra metadata
    email_match = re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b", text)
    email = email_match.group(0) if email_match else None

    profile = StudentProfile(
        name=name,
        education_level=education_level,
        course_and_year=course_and_year,
        skills=skills,
        interests=interests,
        location=location,
        preferred_work_mode=work_mode,
        opportunity_type=opp_type
    )

    return {
        "success": True,
        "filename": filename or "resume.pdf",
        "profile": profile.model_dump(),
        "experience_level": experience_level,
        "detected_skills_count": len(skills),
        "detected_skills": skills,
        "detected_domains": interests,
        "email": email,
        "raw_text_snippet": text[:350].replace("\n", " ").strip(),
        "char_count": len(text),
        "message": f"Successfully parsed candidate profile for {name} ({len(skills)} skills detected)."
    }


def parse_resume_pdf(pdf_bytes: bytes, filename: Optional[str] = None) -> Dict[str, Any]:
    """
    End-to-end pipeline: extracts text from PDF bytes via pypdf and parses into StudentProfile.
    """
    text = extract_text_from_pdf(pdf_bytes)
    return parse_resume_text(text, filename)
