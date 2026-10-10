"""
Jurisdiction-Diff API — deterministic India vs International comparison.

POST /jurisdiction-diff        (also aliased at /api/jurisdiction-diff)

The heavy lifting is in app.jurisdictions.rules; this layer only validates input,
invokes the deterministic engine, runs the output safeguards and shapes the HTTP
response. It never crashes when Ollama/Gemma4 is unavailable — the engine returns a
deterministic, evidence-based comparison and sets `ai_unavailable: true`.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.jurisdictions.rules import build_jurisdiction_diff, validate_diff_response

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Jurisdiction Diff"])

_ALLOWED_JURISDICTIONS = {"diff", "india", "international"}


class JurisdictionDiffRequest(BaseModel):
    query: str = Field("", description="User query / case title")
    formulation: str = Field("", description="Formulation details")
    ingredients: List[str] = Field(default_factory=list)
    jurisdiction: str = Field("diff", description="'diff', 'india' or 'international'")


def _run(payload: JurisdictionDiffRequest) -> dict:
    jur = (payload.jurisdiction or "diff").strip().lower()
    if jur not in _ALLOWED_JURISDICTIONS:
        raise HTTPException(422, f"Unknown jurisdiction '{payload.jurisdiction}'. "
                                 f"Expected one of: diff, india, international.")

    has_input = bool((payload.query or "").strip() or (payload.formulation or "").strip()
                     or [i for i in payload.ingredients if str(i).strip()])
    if not has_input:
        raise HTTPException(422, "Provide at least a query, formulation or ingredient to compare.")

    try:
        diff = build_jurisdiction_diff(
            query=payload.query,
            formulation=payload.formulation,
            ingredients=payload.ingredients,
        )
    except Exception as exc:  # engine must not 500 the whole app
        logger.error("Jurisdiction-diff engine failed: %s", exc)
        raise HTTPException(502, f"Jurisdiction comparison failed: {exc}")

    errors = validate_diff_response(diff)
    if errors:
        # Safeguard tripped — surface honestly rather than returning bad data.
        logger.error("Jurisdiction-diff validation failed: %s", errors)
        raise HTTPException(502, f"Jurisdiction comparison failed validation: {errors}")

    return diff


@router.post("/jurisdiction-diff")
def jurisdiction_diff(payload: JurisdictionDiffRequest):
    return _run(payload)


@router.post("/api/jurisdiction-diff")
def jurisdiction_diff_alias(payload: JurisdictionDiffRequest):
    return _run(payload)
