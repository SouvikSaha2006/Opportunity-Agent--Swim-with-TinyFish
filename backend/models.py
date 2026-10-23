from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class StudentProfile(BaseModel):
    name: str = Field(default="Student", description="Student's name")
    education_level: str = Field(..., description="e.g. Undergraduate, Master's, High School")
    course_and_year: str = Field(..., description="e.g. B.Tech Computer Science 3rd Year")
    skills: List[str] = Field(default_factory=list, description="List of technical/soft skills")
    interests: List[str] = Field(default_factory=list, description="Domains of interest e.g. AI/ML, WebDev")
    location: str = Field(..., description="Preferred or current geographic location")
    preferred_work_mode: Literal["Remote", "In-Office", "Hybrid", "Any"] = Field(
        default="Any",
        description="Preferred mode of work/participation"
    )
    opportunity_type: Literal["Competition", "Internship", "Both"] = Field(
        default="Both",
        description="Target opportunity type"
    )


class RequirementItem(BaseModel):
    requirement: str = Field(..., description="Requirement or criterion analyzed")
    status: Literal["MET", "UNMET", "UNCERTAIN"] = Field(
        ...,
        description="Strict status: MET, UNMET, or UNCERTAIN"
    )
    evidence_or_reason: str = Field(..., description="Extracted textual evidence or reason for status")


class MicroSprint(BaseModel):
    title: str = Field(..., description="Actionable title for the 48-hour sprint")
    duration: str = Field(default="48 Hours", description="Micro-sprint timeframe")
    deliverable: str = Field(..., description="Tangible proof-of-work artifact or GitHub repo to attach to resume")
    steps: List[str] = Field(default_factory=list, description="Phased sprint milestones")


class KeywordDelta(BaseModel):
    matched_keywords: List[str] = Field(
        default_factory=list,
        description="Skills present in profile & found in listing"
    )
    missing_prerequisites: List[str] = Field(
        default_factory=list,
        description="Skills demanded by listing but absent from profile"
    )
    resume_keyword_fixes: List[str] = Field(
        default_factory=list,
        description="Actionable CV optimization suggestions, e.g. Replace 'Backend Dev' with 'RESTful APIs'"
    )
    micro_sprint_task: str = Field(
        ...,
        description="Concrete 48-hour challenge to become eligible"
    )
    micro_sprint: Optional[MicroSprint] = Field(
        default=None,
        description="Structured 48-hour micro-sprint breakdown"
    )


class AuthenticityAudit(BaseModel):
    is_stale_repost: bool = Field(
        ...,
        description="Flag indicating if the listing appears to be an expired or stale repost"
    )
    detected_years: List[int] = Field(
        default_factory=list,
        description="Calendar years detected across title, snippet, and fetched markdown"
    )
    domain_authority_type: str = Field(
        ...,
        description="Domain classification: CANONICAL_HOST, AGGREGATOR_REPOST, or UNKNOWN"
    )
    temporal_warning: Optional[str] = Field(
        default=None,
        description="Warning message explaining temporal drift or legacy dates if detected"
    )
    credibility_flag: str = Field(
        ...,
        description="Overall credibility flag: VERIFIED_CANONICAL, THIRD_PARTY_REPOST, or SUSPECTED_EXPIRED"
    )


class OpportunityRecord(BaseModel):
    id: str = Field(..., description="Unique identifier for opportunity")
    title: str = Field(..., description="Title of competition or internship")
    organization: str = Field(..., description="Hosting organization or company")
    category: str = Field(..., description="Competition, Internship, Hackathon, Grant, etc.")
    summary: str = Field(..., description="Concise synopsis of the opportunity")
    deadline: str = Field(
        default="Unknown - Verification Required",
        description="Application or submission deadline"
    )
    location: str = Field(default="Not Specified", description="Location or remote indicator")
    work_mode: str = Field(default="Unspecified", description="Remote, In-Office, Hybrid, etc.")
    source_url: str = Field(..., description="URL where opportunity was indexed")
    official_application_url: Optional[str] = Field(
        default=None,
        description="Direct application portal URL if detected"
    )
    retrieved_at: str = Field(..., description="ISO 8601 timestamp of retrieval")
    eligibility_status: Literal["Likely Match", "Needs Verification", "Does Not Match"] = Field(
        ...,
        description="Computed match classification"
    )
    requirements_breakdown: List[RequirementItem] = Field(
        default_factory=list,
        description="Audit breakdown for each requirement category"
    )
    match_explanation: str = Field(..., description="Deterministic justification for match score and status")
    next_actions: List[str] = Field(
        default_factory=list,
        description="Actionable next steps for the student"
    )
    ranking_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Deterministic integer ranking score between 0 and 100"
    )
    evidence_snippet: str = Field(..., description="Direct verbatim snippet from source")
    is_live_data: bool = Field(default=True, description="Indicator if sourced via live web agents")
    portal_health_status: Literal[
        "PORTAL_LIVE_VERIFIED",
        "PORTAL_CLOSED_OR_EXPIRED",
        "AUTH_WALL_REQUIRED",
        "PORTAL_UNVERIFIED"
    ] = Field(
        default="PORTAL_UNVERIFIED",
        description="Strict status: PORTAL_LIVE_VERIFIED, PORTAL_CLOSED_OR_EXPIRED, AUTH_WALL_REQUIRED, PORTAL_UNVERIFIED"
    )
    portal_health_detail: str = Field(
        default="Destination could not be reached or confirmed.",
        description="Detailed findings from destination portal stress-testing"
    )
    keyword_delta: Optional[KeywordDelta] = Field(
        default=None,
        description="Skill & keyword delta matrix with CV keyword fixes and 48-hour micro-sprint"
    )
    authenticity_audit: Optional[AuthenticityAudit] = Field(
        default=None,
        description="Authenticity and temporal drift audit"
    )

