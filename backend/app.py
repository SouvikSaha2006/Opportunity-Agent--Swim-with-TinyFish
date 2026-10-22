import os
import json
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from backend.models import StudentProfile, OpportunityRecord
from backend import database
from backend.researcher import (
    build_search_query,
    search_opportunities,
    fetch_page_content,
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

# Enable CORS for React/Vite development and general clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["System"])
async def health_check():
    """Returns backend health and TinyFish API key status."""
    api_key = os.environ.get("TINYFISH_API_KEY", "")
    return {
        "status": "healthy",
        "service": "Opportunity Agent Backend",
        "team": "The MetaMinds",
        "tinyfish_api_key_configured": bool(api_key and not api_key.startswith("your_")),
        "database": "SQLite (initialized)"
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

        # Deterministic audit and scoring
        record = score_and_audit(profile, item, page_markdown)
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


@app.post("/api/research-stream", tags=["Research"])
async def research_stream_endpoint(profile: StudentProfile):
    """
    Streams SSE telemetry and deterministic match results for a given student profile.
    """
    return StreamingResponse(
        event_stream_generator(profile),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
