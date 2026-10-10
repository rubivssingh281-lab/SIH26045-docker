"""
Deterministic Jurisdiction-Diff engine for IP-SAKTI Sahayak.

CORE PRINCIPLE: the LLM must NOT invent legal rules. Every jurisdiction-specific
legal/regulatory statement returned here comes from the structured configuration
files `india.json` / `international.json` (a deterministic rules layer), never from
the model. The LLM (Gemma4 via Ollama) is used ONLY to phrase the already-computed
differences in plain language, and the pipeline works fully without it.

The engine reuses the existing retrieval + citation-validation + confidence
primitives — it does NOT create a second ML model, embedding store or RAG stack.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.rag.prior_art import find_prior_art
from app.pipeline.citation_validation import validate_citations, MIN_EVIDENCE_RELEVANCE
from app.pipeline.confidence import compute_confidence

logger = logging.getLogger(__name__)

_CONFIG_DIR = Path(__file__).parent
_UNVERIFIED = "Source unavailable / not verified"
DISCLAIMER = "AI-assisted information, not legal advice."

_configs: Dict[str, dict] = {}


def _load_config(name: str) -> dict:
    if name not in _configs:
        with (_CONFIG_DIR / f"{name}.json").open("r", encoding="utf-8") as fh:
            _configs[name] = json.load(fh)
    return _configs[name]


# --- Evidence + risk (deterministic, no invented ML) -----------------------

def _evidence_strength(valid: List[dict]) -> str:
    """Qualitative evidence strength from retrieval relevance. Deterministic."""
    if not valid:
        return "NONE"
    top = max(float(v.get("score", 0.0) or 0.0) for v in valid)
    if top >= 0.6:
        return "HIGH"
    if top >= 0.4:
        return "MEDIUM"
    return "LOW"


def _india_concern(strength: str) -> str:
    """
    India-side concern = risk that the formulation faces a patentability / prior-art
    obstacle in India. Tied deterministically to documented-prior-art strength:
    stronger TKDL prior art => greater concern (novelty / s.3(p) exposure).
    """
    return {
        "HIGH": "HIGH",
        "MEDIUM": "MODERATE",
        "LOW": "LOW",
        "NONE": "INSUFFICIENT",
    }[strength]


def _map_evidence(valid: List[dict]) -> List[dict]:
    """Map validated retrieval hits to the citation schema. Never fabricate URLs."""
    out = []
    for item in valid:
        meta = item.get("metadata", {}) or {}
        fid = meta.get("formulation_id") or meta.get("id") or ""
        title = meta.get("title") or meta.get("source") or "TKDL formulation record"
        url = str(meta.get("url", "") or "").strip()
        excerpt = (item.get("text", "") or "").strip()
        out.append({
            "source_title": f"{title} ({fid})" if fid else title,
            "source_type": "official",
            "jurisdiction": "India",
            "source_url": url or _UNVERIFIED,
            "relevance": (excerpt[:280] + "…") if len(excerpt) > 280 else (
                excerpt or "Retrieved as potentially relevant to the described formulation."),
            "retrieval_score": round(float(item.get("score", 0.0) or 0.0), 4),
        })
    return out


# --- Deterministic comparison ----------------------------------------------

# (comparison area label, india config key, international config key)
_CATEGORY_MAP = [
    ("Patentability / Prior art", "patentability_framework", "patentability_framework"),
    ("Traditional Knowledge", "traditional_knowledge_relevance", "traditional_knowledge_relevance"),
    ("TKDL", "prior_art_treatment", "prior_art_treatment"),
    ("Disclosure", "disclosure_requirements", "disclosure_requirements"),
    ("Biodiversity / ABS", "biodiversity_ABS_relevance", "biodiversity_ABS_relevance"),
    ("Source authority", "source_requirements", "source_requirements"),
]


def _field(cfg: dict, key: str) -> dict:
    node = cfg.get(key) or {}
    return {
        "statement": node.get("statement", "Not verified"),
        "citation": node.get("citation", _UNVERIFIED) if node.get("verified", False) else (
            node.get("citation") or _UNVERIFIED),
        "verified": bool(node.get("verified", False)),
    }


def _build_differences(india_cfg: dict, intl_cfg: dict, evidence: List[dict],
                       strength: str) -> List[dict]:
    diffs: List[dict] = []
    for area, ik, xk in _CATEGORY_MAP:
        ifield = _field(india_cfg, ik)
        xfield = _field(intl_cfg, xk)
        diffs.append({
            "area": area,
            "india": ifield["statement"],
            "india_citation": ifield["citation"],
            "international": xfield["statement"],
            "international_citation": xfield["citation"],
        })
    # Evidence availability (dynamic)
    diffs.append({
        "area": "Evidence",
        "india": (f"{len(evidence)} TKDL prior-art candidate(s) retrieved (strength: {strength})."
                  if evidence else "No documented TKDL prior art retrieved for this query."),
        "india_citation": "TKDL retrieval",
        "international": "No jurisdiction-specific evidence corpus is queried; depends on the target office.",
        "international_citation": _UNVERIFIED,
    })
    return diffs


def _common_considerations(evidence: List[dict]) -> List[str]:
    common = [
        "Documented traditional knowledge / prior art can defeat novelty in both India and most other jurisdictions.",
        "Source / origin disclosure and access-and-benefit-sharing obligations may apply in both, though the governing instrument differs.",
        "Neither result is a final patentability determination; both require examination by the competent office.",
    ]
    if evidence:
        common.insert(0, "The retrieved TKDL prior-art candidates are public and relevant to the formulation described.")
    return common


# --- LLM explanation (plain language only, grounded in the diff) ------------

_EXPLAIN_SYSTEM = (
    "You are an Ayurvedic IP research assistant. You are given a DETERMINISTIC jurisdiction "
    "comparison that has already been computed from an authoritative rules layer. Your ONLY job is "
    "to explain it in plain language for a non-lawyer. Absolute rules:\n"
    "- Do NOT introduce any law, section, treaty, case or citation that is not in the provided data.\n"
    "- Do NOT claim anything is legally compliant or patentable.\n"
    "- If a field says 'Not verified' or evidence is missing, say the position is uncertain.\n"
    "- Return ONLY a JSON object with exactly these keys: india, international, main_difference. "
    "Each value is one short plain-language paragraph (2-3 sentences). No extra keys, no commentary."
)


def _fallback_explanation(diff: dict) -> Dict[str, str]:
    india = diff["india"]
    intl = diff["international"]
    return {
        "india": (f"In India, this formulation carries a {india['risk_category']} concern level. "
                  "Traditional knowledge is directly relevant under the Patents Act (s. 3(p)), and TKDL "
                  "is recognised prior art that can defeat novelty. Source/origin disclosure and ABS "
                  "obligations may apply."),
        "international": ("Internationally there is no single patent law. Traditional knowledge is generally "
                         "treated as prior art that can defeat novelty, but there is no universal Section 3(p)-style "
                         "bar. Actual requirements depend on the target country/region."),
        "main_difference": ("India applies a specific statutory traditional-knowledge bar and a recognised TKDL "
                           "prior-art database, whereas the international position varies by country and no "
                           "country-specific rule applies unless a target country is selected."),
        "_ai_unavailable": True,
    }


def _coerce_str(value: Any, prefer_key: str = "") -> str:
    """
    Small models (gemma4) sometimes nest objects instead of returning a plain string.
    Flatten to a clean sentence: prefer a matching sub-key, else join string leaves.
    """
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        if prefer_key and isinstance(value.get(prefer_key), str) and value[prefer_key].strip():
            return value[prefer_key].strip()
        parts = [v.strip() for v in value.values() if isinstance(v, str) and v.strip()]
        return " ".join(parts).strip()
    if isinstance(value, list):
        return " ".join(_coerce_str(v) for v in value).strip()
    return str(value).strip() if value is not None else ""


def _llm_explanation(diff: dict) -> Dict[str, Any]:
    """Ask Gemma4 to phrase the already-computed diff. Falls back deterministically."""
    try:
        from app.llm.client import call_llm  # lazy: keep engine importable without LLM
    except Exception:
        return _fallback_explanation(diff)

    compact = {
        "india": {
            "risk_category": diff["india"]["risk_category"],
            "considerations": diff["india"]["considerations"],
        },
        "international": {
            "risk_category": diff["international"]["risk_category"],
            "considerations": diff["international"]["considerations"],
        },
        "differences": [{"area": d["area"], "india": d["india"], "international": d["international"]}
                        for d in diff["differences"]],
        "evidence_count": len(diff["evidence"]),
    }
    prompt = ("Explain this deterministic jurisdiction comparison in plain language.\n\n"
              + json.dumps(compact, ensure_ascii=False))
    try:
        resp = call_llm(prompt=prompt, system_prompt=_EXPLAIN_SYSTEM,
                        temperature=0.2, max_tokens=500, format="json")
        text = (resp.get("content", "") or "").strip()
        data = json.loads(text)
        fb = _fallback_explanation(diff)
        out = {
            "india": _coerce_str(data.get("india", ""), "india") or fb["india"],
            "international": _coerce_str(data.get("international", ""), "international") or fb["international"],
            "main_difference": _coerce_str(data.get("main_difference", ""), "main_difference") or fb["main_difference"],
        }
        # A usable explanation must read as prose, not a stray fragment.
        if all(len(v) >= 20 for v in out.values()):
            out["_ai_unavailable"] = False
            return out
        logger.warning("LLM explanation too thin; using deterministic fallback.")
    except Exception as exc:
        logger.warning("LLM explanation unavailable (%s); using deterministic fallback.", exc)
    return _fallback_explanation(diff)


# --- Public entry point -----------------------------------------------------

def build_jurisdiction_diff(query: str, formulation: str = "",
                            ingredients: Optional[List[str]] = None,
                            use_llm: bool = True) -> Dict[str, Any]:
    """
    Deterministic India-vs-International comparison for a formulation/query.

    Reuses the existing TKDL retrieval, citation validation and confidence engine.
    Never invents legal rules; the LLM only rephrases the computed result.
    """
    ingredients = [str(i).strip() for i in (ingredients or []) if str(i).strip()]
    query_text = " ".join(p for p in [query or "", formulation or "", " ".join(ingredients)] if p).strip()

    india_cfg = _load_config("india")
    intl_cfg = _load_config("international")

    # 1. Retrieval (reuse existing hybrid TKDL search) + citation validation.
    #    TKDL prior art is not jurisdiction-scoped, so we do not filter by jurisdiction.
    if query_text:
        matches = find_prior_art(query_text, limit=3).get("results", [])
        validated = validate_citations(matches, query_text=query_text)
    else:
        matches, validated = [], []
    valid = [v for v in validated if v.get("is_valid")]

    strength = _evidence_strength(valid)
    evidence = _map_evidence(valid)
    india_concern = _india_concern(strength)

    # 2. India confidence (deterministic dimensions; reuses compute_confidence).
    dims = {
        "fact_conf": 0.8 if query_text else 0.0,          # user-supplied input is treated as confirmed
        "rule_fit_conf": 1.0,                              # deterministic India rules always apply
        "evidence_conf": max((float(v.get("score", 0.0) or 0.0) for v in valid), default=0.0),
        "citation_conf": 1.0 if valid else 0.0,
    }
    india_conf = compute_confidence(dims)

    india_considerations = [
        _field(india_cfg, "traditional_knowledge_relevance")["statement"],
        _field(india_cfg, "prior_art_treatment")["statement"],
        _field(india_cfg, "disclosure_requirements")["statement"],
        _field(india_cfg, "biodiversity_ABS_relevance")["statement"],
    ]
    intl_considerations = [
        _field(intl_cfg, "patentability_framework")["statement"],
        _field(intl_cfg, "traditional_knowledge_relevance")["statement"],
        _field(intl_cfg, "disclosure_requirements")["statement"],
    ]

    differences = _build_differences(india_cfg, intl_cfg, evidence, strength)

    diff: Dict[str, Any] = {
        "success": True,
        "query": query,
        "formulation": formulation,
        "ingredients": ingredients,
        "india": {
            "risk_category": india_concern,          # LOW / MODERATE / HIGH / INSUFFICIENT
            "risk_score": None,                        # no live XGBoost score (label-leakage; not wired)
            "ml_score_note": "XGBoost model is not wired into live scoring (label-leakage per ML handoff).",
            "evidence_strength": strength,
            "considerations": india_considerations,
            "evidence": evidence,
            "confidence": india_conf["band"],
            "confidence_detail": india_conf,
            "official_sources": india_cfg.get("official_sources", []),
        },
        "international": {
            "risk_category": "COUNTRY_DEPENDENT",
            "risk_score": None,
            "ml_score_note": "International ML risk: Not available in current model.",
            "evidence_strength": "NOT_APPLICABLE",
            "considerations": intl_considerations,
            "evidence": [],
            "confidence": "COUNTRY_DEPENDENT",
            "official_sources": intl_cfg.get("official_sources", []),
        },
        "differences": differences,
        "common_considerations": _common_considerations(evidence),
        "evidence": evidence,
        "confidence": india_conf["band"],
        "limitations": list(dict.fromkeys(
            india_cfg.get("limitations", []) + intl_cfg.get("limitations", []))),
        "last_verified": india_cfg.get("last_verified", ""),
        "disclaimer": DISCLAIMER,
    }

    # 3. Plain-language explanation (LLM optional, deterministic fallback).
    explanation = _llm_explanation(diff) if use_llm else _fallback_explanation(diff)
    diff["ai_unavailable"] = bool(explanation.pop("_ai_unavailable", False))
    diff["what_changes"] = explanation

    return diff


# --- Output validation (hallucination + schema safeguards) ------------------

_VALID_RISK = {"LOW", "MODERATE", "HIGH", "INSUFFICIENT"}


def validate_diff_response(diff: Dict[str, Any]) -> List[str]:
    """Return a list of validation errors (empty == valid). Enforces the spec's safeguards."""
    errors: List[str] = []
    if "india" not in diff:
        errors.append("India section missing.")
    if "international" not in diff:
        errors.append("International section missing.")
    if diff.get("india", {}).get("risk_category") not in _VALID_RISK:
        errors.append("India risk_category is not a valid value.")
    # International ML risk must never be invented.
    if diff.get("international", {}).get("risk_score") is not None:
        errors.append("International risk_score must be null (no international ML model).")
    if diff.get("international", {}).get("risk_category") != "COUNTRY_DEPENDENT":
        errors.append("International risk_category must be COUNTRY_DEPENDENT.")
    # No fabricated URLs: every evidence source_url is either a real http(s) URL or the unverified marker.
    for ev in diff.get("evidence", []):
        url = str(ev.get("source_url", ""))
        if url and url != _UNVERIFIED and not url.startswith(("http://", "https://")):
            errors.append(f"Evidence has a non-URL, non-marker source_url: {url!r}")
    for key in ("differences", "common_considerations", "limitations"):
        if not isinstance(diff.get(key), list):
            errors.append(f"'{key}' must be a list.")
    return errors
