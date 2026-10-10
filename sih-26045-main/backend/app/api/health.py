from fastapi import APIRouter
from app.rag.prior_art import get_vector_store

from app.schemas import HealthResponse
from app.translation.bhashini_translator import is_configured

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
def healthcheck():
    dependencies = {
        "llm": "not_configured",
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
