import os
from backend.app import app, health_check, research_stream_endpoint
from backend.models import StudentProfile
import backend.database as database


def _unwrap(coro):
    """Executes a non-awaiting coroutine directly and returns its value."""
    try:
        coro.send(None)
    except StopIteration as e:
        return e.value
    raise RuntimeError("Coroutine did not yield immediate result")


def test_health_check_endpoint():
    """Verify healthcheck returns expected metadata and never leaks raw API keys."""
    data = _unwrap(health_check())
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "environment" in data
    assert "tinyfish_api_key_configured" in data
    assert isinstance(data["tinyfish_api_key_configured"], bool)
    assert data["database"] == "SQLite (initialized)"
    assert data["cors_preview_supported"] is True

    # Confirm no secret keys or tokens are exposed
    for key in data.keys():
        assert "secret" not in key.lower()
        assert "token" not in key.lower()
    if "TINYFISH_API_KEY" in os.environ and os.environ["TINYFISH_API_KEY"]:
        assert os.environ["TINYFISH_API_KEY"] not in str(data)


def test_cors_middleware_configuration():
    """Verify CORS middleware is configured to permit Vercel preview domains and local dev."""
    cors_middlewares = [m for m in app.user_middleware if m.cls.__name__ == "CORSMiddleware"]
    assert len(cors_middlewares) > 0
    middleware_kwargs = cors_middlewares[0].kwargs

    # Check origin regex permits Vercel preview deployments
    assert middleware_kwargs.get("allow_origin_regex") == r"^https://.*\.vercel\.app$"
    assert middleware_kwargs.get("allow_credentials") is True
    assert "*" in middleware_kwargs.get("allow_methods", [])
    assert "*" in middleware_kwargs.get("allow_headers", [])

    # Check default localhost origins are permitted
    origins = middleware_kwargs.get("allow_origins", [])
    assert "http://localhost:5173" in origins or "*" in origins


def test_sse_streaming_headers():
    """Verify unbuffered SSE headers prevent intermediate proxy buffering (e.g. Render/Nginx)."""
    test_profile = StudentProfile(
        name="Alex DevOps",
        education_level="Undergraduate",
        course_and_year="B.Tech Computer Science 3rd Year",
        skills=["Docker", "Kubernetes", "FastAPI"],
        interests=["Cloud Architecture"],
        location="Remote",
        preferred_work_mode="Remote",
        opportunity_type="Both"
    )

    response = _unwrap(research_stream_endpoint(test_profile))
    assert response.media_type == "text/event-stream"
    assert response.headers.get("Cache-Control") == "no-cache, no-transform"
    assert response.headers.get("Connection") == "keep-alive"
    assert response.headers.get("X-Accel-Buffering") == "no"


def test_sqlite_directory_creation(tmp_path):
    """Verify database connection creates parent directory if it does not exist (for persistent volumes)."""
    nested_dir = tmp_path / "persistent" / "storage"
    db_path = str(nested_dir / "test_opportunities.db")
    assert not nested_dir.exists()
    conn = database.get_db_connection(db_path)
    try:
        assert nested_dir.exists()
    finally:
        conn.close()
