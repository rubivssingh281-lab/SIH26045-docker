import json
import uuid
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.db import get_db
from app.pipeline.normalization import normalize_text
from app.pipeline.orchestrator import execute_analysis, execute_fact_extraction
from app.utils.pdf_report import build_case_report_pdf, build_archive_pdf

router = APIRouter(prefix="/cases", tags=["Cases"])

from fastapi import UploadFile, File

@router.post("/upload")
def upload_document(file: UploadFile = File(...)):
    if file.filename.endswith(".pdf") or file.content_type == "application/pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(file.file)
            text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
            return {"extracted_text": text, "filename": file.filename}
        except Exception as e:
            raise HTTPException(400, f"Error parsing PDF: {e}")
    else:
        try:
            text = file.file.read().decode("utf-8")
            return {"extracted_text": text, "filename": file.filename}
        except Exception as e:
            raise HTTPException(400, f"Error reading text file: {e}. Only PDFs and UTF-8 text files are supported.")


# Maps internal pipeline statuses to the CaseStatus enum the frontend renders.
_STATUS_MAP = {
    "PENDING": "PENDING",
    "VERIFYING": "VERIFYING",
    "PROCESSING": "ANALYZING",
    "SCORED": "ANALYZING",
    "EXPLAINED": "ANALYZING",
    "DONE": "COMPLETE",
    "ESCALATED": "ESCALATED",
    "FAILED": "ABSTAINED",
}


def _map_status(internal_status: str | None, result: dict) -> str:
    mapped = _STATUS_MAP.get(internal_status or "PENDING", internal_status or "PENDING")
    # An abstaining completed analysis surfaces as ABSTAINED, not COMPLETE.
    if mapped == "COMPLETE" and result.get("result_type") == "ABSTENTION":
        return "ABSTAINED"
    return mapped


def _case(case: models.FormulationSubmission) -> dict:
    result = json.loads(case.result_json or "{}")
    has_analysis = "classification" in result
    return {"id": case.submission_id, "title": case.title or "", "description": case.description or "",
            "as_of_date": case.as_of_date or "", "jurisdiction": case.jurisdiction or "INDIA",
            "status": _map_status(case.status, result), "classification": result.get("classification"),
            "confidence": result.get("confidence"), "version": result.get("version", 0),
            "created_at": case.created_at.isoformat() if case.created_at else None,
            "updated_at": case.updated_at.isoformat() if case.updated_at else None,
            "tool": case.tool, "tool_input": json.loads(case.tool_input) if case.tool_input else None,
            "history": result.get("history", []),
            # Full stored analysis so the detail view rehydrates after a reload.
            "analysis": result if has_analysis else None}


def _facts(db: Session, case_id: str) -> list[dict]:
    return [{"id": str(item.id), "field": item.field, "value": item.value or "", "normalized_value": item.normalized_value,
             "status": item.status, "confidence": item.confidence or 0.0, "source_span": item.source_span,
             "user_editable": True} for item in db.query(models.ExtractedFact).filter_by(submission_id=case_id).order_by(models.ExtractedFact.id).all()]


@router.post("", response_model=schemas.CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(payload: schemas.CreateCasePayload, db: Session = Depends(get_db)):
    dump = payload.model_dump()
    if dump.get("tool_input"):
        dump["tool_input"] = json.dumps(dump["tool_input"])
    
    item = models.FormulationSubmission(submission_id=f"CASE-{uuid.uuid4().hex[:8].upper()}", **dump, status="PENDING")
    
    import datetime
    result = {"history": [{"id": f"history-{uuid.uuid4().hex[:8]}", "type": "CREATED", "title": "Case created", "description": "Research case created.", "actor": "User", "occurred_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "version": 1}]}
    item.result_json = json.dumps(result)
    
    db.add(item); db.commit(); db.refresh(item)
    return _case(item)


@router.get("", response_model=List[schemas.CaseResponse])
def get_cases(db: Session = Depends(get_db)):
    return [_case(item) for item in db.query(models.FormulationSubmission).order_by(models.FormulationSubmission.created_at.desc()).all()]


@router.get("/{id}", response_model=schemas.CaseResponse)
def get_case(id: str, db: Session = Depends(get_db)):
    item = db.query(models.FormulationSubmission).filter_by(submission_id=id).first()
    if not item: raise HTTPException(404, "Case not found")
    return _case(item)


@router.post("/{id}/facts")
def extract_or_confirm_facts(id: str, payload: schemas.FactsPayload | None = None, db: Session = Depends(get_db)):
    case = db.query(models.FormulationSubmission).filter_by(submission_id=id).first()
    if not case: raise HTTPException(404, "Case not found")
    if payload is None:
        raw = execute_fact_extraction(id, case.description or "")
        db.query(models.ExtractedFact).filter_by(submission_id=id).delete()
        for fact in raw:
            db.add(models.ExtractedFact(submission_id=id, field=fact["key"], value=str(fact["value"]).lower(), normalized_value=normalize_text(str(fact["value"])), status="EXTRACTED", confidence=fact["extraction_confidence"], source_span=fact.get("source_span")))
        case.status = "VERIFYING"; db.commit()
        return {"message": "Facts extracted; user confirmation is required before analysis.", "facts": _facts(db, id)}
    db.query(models.ExtractedFact).filter_by(submission_id=id).delete()
    for fact in payload.facts:
        db.add(models.ExtractedFact(submission_id=id, field=fact.field, value=str(fact.value).lower() if isinstance(fact.value, bool) else str(fact.value), normalized_value=fact.normalized_value or normalize_text(str(fact.value)), status="CONFIRMED", confidence=fact.confidence, source_span=fact.source_span))
    case.status = "PENDING"; db.commit()
    return {"message": "Confirmed facts persisted.", "facts": _facts(db, id)}


@router.post("/{id}/analyze")
def run_analysis(id: str, payload: schemas.AnalyzePayload, db: Session = Depends(get_db)):
    case = db.query(models.FormulationSubmission).filter_by(submission_id=id).first()
    if not case: raise HTTPException(404, "Case not found")
    if not db.query(models.ExtractedFact).filter_by(submission_id=id, status="CONFIRMED").count(): raise HTTPException(400, "Facts must be confirmed before analysis.")
    case.jurisdiction, case.as_of_date = payload.jurisdiction, payload.as_of_date
    if payload.tool: case.tool = payload.tool
    db.commit()
    try: return execute_analysis(id)
    except ValueError as exc: raise HTTPException(400, str(exc))


@router.get("/{id}/explain")
def get_explainability(id: str, db: Session = Depends(get_db)):
    case = db.query(models.FormulationSubmission).filter_by(submission_id=id).first()
    if not case: raise HTTPException(404, "Case not found")
    result = json.loads(case.result_json or "{}")
    if "classification" not in result: raise HTTPException(404, "No analysis found for this case. Run /analyze first.")
    from app.pipeline.explain import build_detailed_trace
    # Rebuild the detailed trace from the stored result so older analyses also
    # show the full facts / rules / evidence-with-sources / confidence breakdown.
    steps = build_detailed_trace(result)
    return {"steps": steps, "confidence": result.get("confidence", {}), "facts": _facts(db, id)}


@router.get("/{id}/report")
def get_report(id: str, db: Session = Depends(get_db)):
    case = db.query(models.FormulationSubmission).filter_by(submission_id=id).first()
    if not case: raise HTTPException(404, "Report not available")
    case_view = _case(case)
    analysis = json.loads(case.result_json) if case.result_json else {}
    pdf_bytes = build_case_report_pdf(case_view, analysis)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{id}-case-report.pdf"'},
    )


@router.post("/export-pdf")
def export_archive_pdf(payload: schemas.ArchiveExportPayload):
    pdf_bytes = build_archive_pdf([row.model_dump() for row in payload.rows])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="ip-sakti-case-archive.pdf"'},
    )


@router.post("/{id}/ask-result")
def save_ask_result(id: str, payload: schemas.AskResultPayload, db: Session = Depends(get_db)):
    """Persist an Ask-Sahayak grounded answer onto the case so it appears in the report/history."""
    case = db.query(models.FormulationSubmission).filter_by(submission_id=id).first()
    if not case: raise HTTPException(404, "Case not found")
    result = json.loads(case.result_json or "{}")
    result["grounded_answer"] = {
        "answer": payload.answer,
        "citations": [c.model_dump() for c in payload.citations],
    }
    case.result_json = json.dumps(result)
    db.commit()
    return {"ok": True}


@router.post("/{id}/escalate")
def escalate(id: str, payload: schemas.EscalatePayload, db: Session = Depends(get_db)):
    case = db.query(models.FormulationSubmission).filter_by(submission_id=id).first()
    if not case: raise HTTPException(404, "Case not found")
    result = json.loads(case.result_json or "{}"); result["escalation"] = {"id": f"esc-{uuid.uuid4().hex[:10]}", "reason": payload.reason, "status": "REQUESTED"}
    case.status, case.result_json = "ESCALATED", json.dumps(result); db.commit()
    return result["escalation"]
