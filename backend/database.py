import json
import os
import sqlite3
from typing import List, Dict, Any, Optional

DEFAULT_DB_PATH = os.environ.get(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(__file__), "opportunities.db")
)


def get_db_connection(db_path: str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    """Creates a sqlite3 connection with dict-like row factory."""
    db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str = DEFAULT_DB_PATH) -> None:
    """Initializes the SQLite schema for saved opportunities."""
    schema = """
    CREATE TABLE IF NOT EXISTS saved_opportunities (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        organization TEXT NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        deadline TEXT NOT NULL,
        location TEXT NOT NULL,
        work_mode TEXT NOT NULL,
        source_url TEXT NOT NULL,
        official_application_url TEXT,
        retrieved_at TEXT NOT NULL,
        eligibility_status TEXT NOT NULL,
        requirements_breakdown TEXT NOT NULL,
        match_explanation TEXT NOT NULL,
        next_actions TEXT NOT NULL,
        ranking_score INTEGER NOT NULL,
        evidence_snippet TEXT NOT NULL,
        is_live_data INTEGER NOT NULL DEFAULT 1,
        portal_health_status TEXT DEFAULT 'PORTAL_UNVERIFIED',
        portal_health_detail TEXT DEFAULT 'Destination could not be reached or confirmed.',
        keyword_delta TEXT,
        authenticity_audit TEXT
    );
    """
    with get_db_connection(db_path) as conn:
        conn.execute(schema)
        # Migrate existing tables if columns are missing
        try:
            conn.execute("ALTER TABLE saved_opportunities ADD COLUMN portal_health_status TEXT DEFAULT 'PORTAL_UNVERIFIED'")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE saved_opportunities ADD COLUMN portal_health_detail TEXT DEFAULT 'Destination could not be reached or confirmed.'")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE saved_opportunities ADD COLUMN keyword_delta TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE saved_opportunities ADD COLUMN authenticity_audit TEXT")
        except sqlite3.OperationalError:
            pass
        conn.commit()



def save_opportunity(opp: Dict[str, Any], db_path: str = DEFAULT_DB_PATH) -> Dict[str, Any]:
    """
    Persists an opportunity record into the database.
    Serializes nested lists and models into JSON strings.
    """
    init_db(db_path)

    requirements_breakdown = opp.get("requirements_breakdown", [])
    if isinstance(requirements_breakdown, (list, tuple)):
        serializable_reqs = []
        for item in requirements_breakdown:
            if hasattr(item, "model_dump"):
                serializable_reqs.append(item.model_dump())
            elif isinstance(item, dict):
                serializable_reqs.append(item)
            else:
                serializable_reqs.append(str(item))
        reqs_json = json.dumps(serializable_reqs)
    elif isinstance(requirements_breakdown, str):
        reqs_json = requirements_breakdown
    else:
        reqs_json = json.dumps([])

    next_actions = opp.get("next_actions", [])
    if isinstance(next_actions, (list, tuple)):
        actions_json = json.dumps(list(next_actions))
    elif isinstance(next_actions, str):
        actions_json = next_actions
    else:
        actions_json = json.dumps([])

    keyword_delta = opp.get("keyword_delta")
    if hasattr(keyword_delta, "model_dump"):
        kd_json = json.dumps(keyword_delta.model_dump())
    elif isinstance(keyword_delta, dict):
        kd_json = json.dumps(keyword_delta)
    elif isinstance(keyword_delta, str):
        kd_json = keyword_delta
    else:
        kd_json = None

    authenticity_audit = opp.get("authenticity_audit")
    if hasattr(authenticity_audit, "model_dump"):
        audit_json = json.dumps(authenticity_audit.model_dump())
    elif isinstance(authenticity_audit, dict):
        audit_json = json.dumps(authenticity_audit)
    elif isinstance(authenticity_audit, str):
        audit_json = authenticity_audit
    else:
        audit_json = None

    is_live_data_val = 1 if opp.get("is_live_data", True) else 0

    query = """
    INSERT INTO saved_opportunities (
        id, title, organization, category, summary, deadline, location,
        work_mode, source_url, official_application_url, retrieved_at,
        eligibility_status, requirements_breakdown, match_explanation,
        next_actions, ranking_score, evidence_snippet, is_live_data,
        portal_health_status, portal_health_detail, keyword_delta,
        authenticity_audit
    ) VALUES (
        :id, :title, :organization, :category, :summary, :deadline, :location,
        :work_mode, :source_url, :official_application_url, :retrieved_at,
        :eligibility_status, :requirements_breakdown, :match_explanation,
        :next_actions, :ranking_score, :evidence_snippet, :is_live_data,
        :portal_health_status, :portal_health_detail, :keyword_delta,
        :authenticity_audit
    )
    ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        organization = excluded.organization,
        category = excluded.category,
        summary = excluded.summary,
        deadline = excluded.deadline,
        location = excluded.location,
        work_mode = excluded.work_mode,
        source_url = excluded.source_url,
        official_application_url = excluded.official_application_url,
        retrieved_at = excluded.retrieved_at,
        eligibility_status = excluded.eligibility_status,
        requirements_breakdown = excluded.requirements_breakdown,
        match_explanation = excluded.match_explanation,
        next_actions = excluded.next_actions,
        ranking_score = excluded.ranking_score,
        evidence_snippet = excluded.evidence_snippet,
        is_live_data = excluded.is_live_data,
        portal_health_status = excluded.portal_health_status,
        portal_health_detail = excluded.portal_health_detail,
        keyword_delta = excluded.keyword_delta,
        authenticity_audit = excluded.authenticity_audit;
    """

    params = {
        "id": str(opp.get("id")),
        "title": str(opp.get("title", "Untitled")),
        "organization": str(opp.get("organization", "Unknown")),
        "category": str(opp.get("category", "General")),
        "summary": str(opp.get("summary", "")),
        "deadline": str(opp.get("deadline", "Unknown - Verification Required")),
        "location": str(opp.get("location", "Not Specified")),
        "work_mode": str(opp.get("work_mode", "Unspecified")),
        "source_url": str(opp.get("source_url", "")),
        "official_application_url": opp.get("official_application_url"),
        "retrieved_at": str(opp.get("retrieved_at", "")),
        "eligibility_status": str(opp.get("eligibility_status", "Needs Verification")),
        "requirements_breakdown": reqs_json,
        "match_explanation": str(opp.get("match_explanation", "")),
        "next_actions": actions_json,
        "ranking_score": int(opp.get("ranking_score", 0)),
        "evidence_snippet": str(opp.get("evidence_snippet", "")),
        "is_live_data": is_live_data_val,
        "portal_health_status": str(opp.get("portal_health_status", "PORTAL_UNVERIFIED")),
        "portal_health_detail": str(opp.get("portal_health_detail", "Destination could not be reached or confirmed.")),
        "keyword_delta": kd_json,
        "authenticity_audit": audit_json,
    }

    with get_db_connection(db_path) as conn:
        conn.execute(query, params)
        conn.commit()

    return opp


def get_saved_opportunities(db_path: str = DEFAULT_DB_PATH) -> List[Dict[str, Any]]:
    """
    Retrieves all saved opportunities from SQLite, deserializing JSON fields.
    """
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM saved_opportunities ORDER BY ranking_score DESC")
        rows = cursor.fetchall()

    results: List[Dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        try:
            item["requirements_breakdown"] = json.loads(item["requirements_breakdown"])
        except (json.JSONDecodeError, TypeError):
            item["requirements_breakdown"] = []

        try:
            item["next_actions"] = json.loads(item["next_actions"])
        except (json.JSONDecodeError, TypeError):
            item["next_actions"] = []

        if item.get("keyword_delta"):
            try:
                item["keyword_delta"] = json.loads(item["keyword_delta"])
            except (json.JSONDecodeError, TypeError):
                pass

        if item.get("authenticity_audit"):
            try:
                item["authenticity_audit"] = json.loads(item["authenticity_audit"])
            except (json.JSONDecodeError, TypeError):
                pass

        item["is_live_data"] = bool(item.get("is_live_data", 1))
        item["portal_health_status"] = item.get("portal_health_status") or "PORTAL_UNVERIFIED"
        item["portal_health_detail"] = item.get("portal_health_detail") or "Destination could not be reached or confirmed."
        results.append(item)


    return results


def delete_saved_opportunity(opp_id: str, db_path: str = DEFAULT_DB_PATH) -> bool:
    """
    Removes an opportunity by ID. Returns True if a record was deleted, False otherwise.
    """
    init_db(db_path)
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM saved_opportunities WHERE id = ?", (opp_id,))
        conn.commit()
        return cursor.rowcount > 0
