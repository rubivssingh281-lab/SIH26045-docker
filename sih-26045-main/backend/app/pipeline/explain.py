from typing import List, Dict, Any


def _pct(v) -> str:
    try:
        return f"{round(float(v) * 100)}%"
    except (TypeError, ValueError):
        return "—"


def build_detailed_trace(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Build a rich, human-readable explainability trace from a stored analysis
    result. Each step carries a title, a status, a summary line, and a list of
    `items` (label / value / meta) so the UI can show the actual confirmed facts,
    the rules that fired, the retrieved evidence WITH its sources/citations, and
    the full confidence breakdown — not just one-line counts.
    """
    facts = result.get("facts") or []
    fired = result.get("fired_rules") or []
    evidence = result.get("evidence") or []
    conf = result.get("confidence") or {}
    classification = result.get("classification") or "—"
    band = conf.get("band", "—")
    rules_applied = len(fired)

    steps: List[Dict[str, Any]] = []

    # 1 — Confirmed facts
    steps.append({
        "title": "Confirmed facts",
        "status": "success" if facts else "warning",
        "details": f"{len(facts)} fact(s) confirmed by the user form the basis of this assessment.",
        "items": [{
            "label": str(f.get("key") or f.get("field") or "fact").replace("_", " "),
            "value": str(f.get("value")),
            "meta": (f"source: “{f.get('source_span')}”" if f.get("source_span") else "confirmed by user"),
        } for f in facts],
    })

    # 2 — Rule evaluation
    if fired:
        steps.append({
            "title": "Rule evaluation",
            "status": "success",
            "details": f"Classification: {classification} — {rules_applied} deterministic rule(s) fired.",
            "items": [{
                "label": r.get("name") or r.get("id") or "rule",
                "value": r.get("conclusion") or "",
                "meta": (f"Citation: {r.get('citation')}" if r.get("citation") else (r.get("explanation") or "")),
            } for r in fired],
        })
    else:
        steps.append({
            "title": "Rule evaluation",
            "status": "warning",
            "details": (f"Classification: {classification}. No deterministic rule in the current rule set matched the "
                        f"confirmed facts, so the rule engine did not assert a definitive legal category. Any "
                        f"tool-specific assessment shown is a structured review, not a rule-based verdict."),
            "items": [],
        })

    # 3 — Supporting evidence & sources
    steps.append({
        "title": "Supporting evidence & sources",
        "status": "success" if evidence else "warning",
        "details": (f"{len(evidence)} record(s) retrieved from the TKDL corpus and validated for relevance."
                    if evidence else "No supporting evidence was retrieved for this case."),
        "items": [{
            "label": e.get("title") or e.get("id") or "record",
            "value": ((e.get("excerpt") or "")[:240] + ("…" if len(e.get("excerpt") or "") > 240 else "")),
            "meta": f"{e.get('citation', 'TKDL record')} · {'Validated' if e.get('validated') else 'Needs review'}",
        } for e in evidence],
    })

    # 4 — Confidence breakdown
    steps.append({
        "title": "Confidence",
        "status": ("success" if band in ("HIGH", "MEDIUM") else "warning" if band == "LOW" else "error"),
        "details": f"Overall band: {band} (weakest-link of the four dimensions).",
        "items": [
            {"label": "Fact confidence", "value": _pct(conf.get("fact_conf")), "meta": "quality of the confirmed facts"},
            {"label": "Rule-fit confidence", "value": _pct(conf.get("rule_fit_conf")), "meta": "how cleanly a rule / assessment applied"},
            {"label": "Evidence confidence", "value": _pct(conf.get("evidence_conf")), "meta": "strength of retrieved prior art"},
            {"label": "Citation confidence", "value": _pct(conf.get("citation_conf")), "meta": "evidence validation"},
            {"label": "Overall assessment", "value": _pct(conf.get("overall_conf")), "meta": f"band: {band}"},
        ],
    })

    # 5 — Conclusion (natural-language, LLM-generated; markdown rendered by the UI)
    conclusion_text = result.get("conclusion_text")
    if not conclusion_text:
        # Deterministic fallback for older analyses that predate conclusion_text.
        default = {
            "HIGH": "The result is well supported by the confirmed facts and validated evidence.",
            "MEDIUM": "The result is supported; review the evidence before relying on it.",
            "LOW": "Support is weak — provide more facts or request human review.",
            "INSUFFICIENT": "Insufficient grounded evidence — the system abstains and recommends human review.",
        }.get(band, "")
        conclusion_text = f"**Summary:** Classification: {classification} (confidence band {band}). {default}"
    steps.append({
        "title": "Conclusion",
        "status": "success",
        "details": conclusion_text,
        "items": [],
    })
    return steps


def assemble_trace(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Assembles a coherent trace/log of pipeline events for the frontend.
    This enhances explainability by showing exactly what happened at each step.
    """
    trace = []
    for idx, event in enumerate(events or []):
        trace.append({
            "step": idx + 1,
            "module": event.get("module", "unknown"),
            "action": event.get("action", "unknown action"),
            "timestamp": event.get("timestamp"),
            "details": event.get("details", {}),
        })
    return trace
