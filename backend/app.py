import os
import json
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from backend.models import StudentProfile, OpportunityRecord
from backend import database
from backend.resume_parser import parse_resume_pdf, parse_resume_text
from backend.researcher import (
    build_search_query,
    search_opportunities,
    fetch_page_content,
    verify_destination_portal,
    TINYFISH_API_KEY
)
from backend.matcher import score_and_audit

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite schema at startup
    database.init_db()
    yield


app = FastAPI(
    title="Opportunity Agent API",
    description="Backend integrating TinyFish Web Agent API with deterministic eligibility auditing",
    version="1.0.0",
    lifespan=lifespan
)

# Permissive Production & Preview CORS Configuration
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
custom_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

frontend_url = os.environ.get("FRONTEND_URL", "").strip()
if frontend_url and frontend_url not in custom_origins:
    custom_origins.append(frontend_url)

allowed_origins = list(dict.fromkeys(default_origins + custom_origins))

# Permit incoming requests from Vercel previews (*.vercel.app), local dev, and production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["System"])
async def health_check():
    """Returns backend health, timestamp, and environment sanity checks without leaking secrets."""
    api_key = os.environ.get("TINYFISH_API_KEY", "")
    return {
        "status": "healthy",
        "service": "Opportunity Agent Backend",
        "team": "The MetaMinds",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": os.environ.get(
            "ENVIRONMENT",
            "production" if (os.environ.get("RENDER") or os.environ.get("RAILWAY_ENVIRONMENT")) else "development"
        ),
        "tinyfish_api_key_configured": bool(api_key and not api_key.startswith("your_")),
        "database": "SQLite (initialized)",
        "cors_preview_supported": True
    }


@app.get("/api/saved", response_model=List[Dict[str, Any]], tags=["Persistence"])
async def list_saved_opportunities():
    """Returns saved opportunity records from SQLite database."""
    try:
        return database.get_saved_opportunities()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query saved opportunities: {str(e)}"
        )


@app.post("/api/save", tags=["Persistence"])
async def save_opportunity_endpoint(opportunity: OpportunityRecord):
    """Persists an opportunity record to SQLite."""
    try:
        database.save_opportunity(opportunity.model_dump())
        return {
            "status": "saved",
            "id": opportunity.id,
            "title": opportunity.title
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save opportunity: {str(e)}"
        )


@app.delete("/api/saved/{opp_id}", tags=["Persistence"])
async def delete_saved_opportunity_endpoint(opp_id: str):
    """Deletes a saved opportunity by its ID."""
    success = database.delete_saved_opportunity(opp_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity with ID '{opp_id}' not found."
        )
    return {"status": "deleted", "id": opp_id}


async def event_stream_generator(profile: StudentProfile):
    """
    Asynchronous event generator producing Server-Sent Events (SSE) telemetry,
    progressively querying TinyFish Search and Fetch, running deterministic audit,
    and streaming final results.
    """
    def sse_message(payload: Dict[str, Any]) -> str:
        return f"data: {json.dumps(payload)}\n\n"

    # Step 1: Telemetry Initialization
    yield sse_message({
        "type": "TELEMETRY",
        "phase": "INITIALIZATION",
        "detail": f"Pipeline started for student: {profile.name} ({profile.course_and_year})",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    await asyncio.sleep(0.05)

    # Step 2: Build Query & TinyFish Search
    query = build_search_query(profile)
    yield sse_message({
        "type": "TELEMETRY",
        "phase": "SEARCH_START",
        "detail": f"Constructed TinyFish Search query: '{query}'",
        "query": query,
        "location": "IN"
    })
    await asyncio.sleep(0.05)

    loop = asyncio.get_running_loop()
    search_results, search_telemetry = await loop.run_in_executor(
        None,
        search_opportunities,
        query,
        "IN",
        5
    )

    yield sse_message({
        "type": "TELEMETRY",
        "phase": "SEARCH_COMPLETE",
        "detail": f"TinyFish Search returned {len(search_results)} candidates in {search_telemetry.get('latency_ms', 0)}ms",
        "telemetry": search_telemetry
    })
    await asyncio.sleep(0.05)

    # Step 3: Fetch & Audit Candidates
    yield sse_message({
        "type": "TELEMETRY",
        "phase": "FETCH_START",
        "detail": f"Beginning page markdown extraction for {len(search_results)} candidates..."
    })

    scored_records: List[OpportunityRecord] = []

    for index, item in enumerate(search_results, 1):
        item_url = item.get("url", "")
        item_title = item.get("title", f"Candidate {index}")

        yield sse_message({
            "type": "TELEMETRY",
            "phase": "FETCHING_ITEM",
            "detail": f"Fetching page {index}/{len(search_results)}: '{item_title[:45]}...'",
            "target_url": item_url
        })

        page_markdown = ""
        fetch_telemetry: Dict[str, Any] = {}

        if item_url and item_url.startswith("http"):
            page_markdown, fetch_telemetry = await loop.run_in_executor(
                None,
                fetch_page_content,
                item_url
            )
            yield sse_message({
                "type": "TELEMETRY",
                "phase": "FETCH_COMPLETE",
                "detail": f"Fetched {len(page_markdown)} chars in {fetch_telemetry.get('latency_ms', 0)}ms for {item_title[:30]}",
                "telemetry": fetch_telemetry
            })
        else:
            yield sse_message({
                "type": "TELEMETRY",
                "phase": "FETCH_SKIPPED",
                "detail": f"No valid URL for {item_title}, using search snippet for audit.",
            })

        # Deep Crawler: Autonomous Destination Inspection / Portal Stress-Tester
        target_portal_url = item.get("official_application_url") or item_url or item.get("url", "")
        portal_status = "PORTAL_UNVERIFIED"
        portal_detail = "Destination could not be reached or confirmed."

        if target_portal_url and target_portal_url.startswith("http"):
            yield sse_message({
                "type": "TELEMETRY",
                "phase": "DEEP_AUDIT",
                "detail": f"Testing destination portal responsiveness for {target_portal_url[:45]}...",
                "target_url": target_portal_url
            })
            portal_status, portal_detail = await loop.run_in_executor(
                None,
                verify_destination_portal,
                target_portal_url
            )

        # Deterministic audit and scoring
        record = score_and_audit(
            profile,
            item,
            page_markdown,
            portal_health_status=portal_status,
            portal_health_detail=portal_detail
        )
        scored_records.append(record)
        await asyncio.sleep(0.05)

    # Step 4: Audit Completion & Ranking
    yield sse_message({
        "type": "TELEMETRY",
        "phase": "AUDIT_COMPLETE",
        "detail": f"Deterministic eligibility audit complete across {len(scored_records)} opportunities. Sorting by ranking score..."
    })

    # Sort descending by ranking_score
    scored_records.sort(key=lambda r: r.ranking_score, reverse=True)

    # Step 5: Deliver Results Payload
    yield sse_message({
        "type": "RESULTS",
        "data": [r.model_dump() for r in scored_records]
    })
    await asyncio.sleep(0.05)

    # Step 6: Complete Event
    yield sse_message({
        "type": "COMPLETE",
        "detail": "Opportunity research, verification audit, and scoring finished.",
        "total_results": len(scored_records),
        "likely_matches": sum(1 for r in scored_records if r.eligibility_status == "Likely Match")
    })


# Alias matching feature specification
run_research_stream = event_stream_generator


@app.post("/api/research-stream", tags=["Research"])
async def research_stream_endpoint(profile: StudentProfile):
    """
    Streams SSE telemetry and deterministic match results for a given student profile.
    """
    return StreamingResponse(
        event_stream_generator(profile),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/resume/parse", tags=["Resume"])
async def parse_resume_endpoint(file: UploadFile = File(...)):
    """
    Extracts text and structured candidate profile from an uploaded PDF resume
    using lightweight pypdf and regex entity extraction.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file was uploaded."
        )

    is_pdf = file.filename.lower().endswith(".pdf") or (file.content_type and "pdf" in file.content_type.lower())
    if not is_pdf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported (.pdf)."
        )

    try:
        pdf_bytes = file.file.read() if hasattr(file, "file") else await file.read()
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF file is empty (0 bytes)."
            )
        if len(pdf_bytes) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds maximum supported limit of 10MB."
            )

        parsed_data = parse_resume_pdf(pdf_bytes, filename=file.filename)
        return parsed_data
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process PDF resume: {str(e)}"
        )


@app.post("/api/resume/research-stream", tags=["Resume"])
async def resume_research_stream_endpoint(file: UploadFile = File(...)):
    """
    Accepts an uploaded PDF resume, extracts candidate profile instantly,
    and returns an SSE stream that discovers and ranks opportunities.
    """
    if not file.filename or not (file.filename.lower().endswith(".pdf") or (file.content_type and "pdf" in file.content_type.lower())):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported (.pdf)."
        )

    try:
        pdf_bytes = file.file.read() if hasattr(file, "file") else await file.read()
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF file is empty (0 bytes)."
            )
        parsed_data = parse_resume_pdf(pdf_bytes, filename=file.filename)
        profile = StudentProfile(**parsed_data["profile"])
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to parse resume: {str(e)}")

    async def resume_event_stream():
        def sse_message(payload: Dict[str, Any]) -> str:
            return f"data: {json.dumps(payload)}\n\n"

        yield sse_message({
            "type": "TELEMETRY",
            "phase": "RESUME_PARSED",
            "detail": f"Resume '{file.filename}' parsed: {parsed_data.get('detected_skills_count', 0)} skills detected for {profile.name} ({parsed_data.get('experience_level', 'Student')}).",
            "parsed_profile": parsed_data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        await asyncio.sleep(0.05)

        async for chunk in event_stream_generator(profile):
            yield chunk

    return StreamingResponse(
        resume_event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    is_dev = os.environ.get("ENVIRONMENT", "development").lower() == "development"
    uvicorn.run(
        "backend.app:app",
        host="0.0.0.0",
        port=port,
        reload=is_dev,
        proxy_headers=True,
        forwarded_allow_ips="*"
    )
