import os
from fastapi import APIRouter
from app.rag.prior_art import get_vector_store

from app.schemas import HealthResponse
from app.translation.bhashini_translator import is_configured

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
def healthcheck():
    from app.config import settings
    llm_configured = bool(
        (settings.llm_provider == "openai" and bool(settings.openai_api_key or os.getenv("OPENAI_API_KEY")))
        or settings.llm_provider == "ollama"
    )
    dependencies = {
        "llm": "configured" if llm_configured else "missing_key",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "vector_store": "unavailable",
        "bhashini": "configured" if is_configured() else "not_configured",
    }
    try:
        get_vector_store().collection.count()
        dependencies["vector_store"] = "available"
    except Exception:
        pass
    status = "ok" if dependencies["vector_store"] == "available" else "degraded"
    return {"status": status, "app": "backend", "dependencies": dependencies}
