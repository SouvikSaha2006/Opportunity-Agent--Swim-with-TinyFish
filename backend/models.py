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

