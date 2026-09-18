"""
Jurisdiction-Diff tests. Retrieval and the LLM are stubbed so the deterministic
engine is tested in isolation (no live ChromaDB / Ollama required).
"""
import pytest

from app.jurisdictions import rules
from app.jurisdictions.rules import build_jurisdiction_diff, validate_diff_response
from app.api.jurisdiction_diff import _run, JurisdictionDiffRequest
from fastapi import HTTPException


def _matches(*scores):
    """Fake retrieval hits carrying a relevance `score` (validate_citations uses it)."""
    return [
        {"score": s, "text": f"Formulation record {i} for fever with holarrhena and turmeric.",
         "metadata": {"formulation_id": f"F{i:03d}", "title": f"Record {i}", "url": ""}}
        for i, s in enumerate(scores, start=1)
    ]


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    """Default: skip the network LLM; individual tests opt back in."""
    monkeypatch.setattr(rules, "find_prior_art", lambda *a, **k: {"results": []})


# TEST 1 — Normal Indian formulation with TKDL evidence.
def test_normal_formulation_with_tkdl_evidence(monkeypatch):
    monkeypatch.setattr(rules, "find_prior_art", lambda *a, **k: {"results": _matches(0.72, 0.55)})
    diff = build_jurisdiction_diff("herbs for fever", "decoction of holarrhena", ["turmeric"], use_llm=False)
    assert diff["success"] is True
    assert len(diff["evidence"]) == 2
    assert diff["india"]["evidence_strength"] == "HIGH"
    assert diff["india"]["risk_category"] == "HIGH"          # strong prior art => high concern
    assert diff["evidence"][0]["source_type"] == "official"
    assert validate_diff_response(diff) == []


# TEST 2 — Formulation with no meaningful TKDL evidence (all below threshold).
def test_formulation_no_meaningful_evidence(monkeypatch):
    monkeypatch.setattr(rules, "find_prior_art", lambda *a, **k: {"results": _matches(0.12, 0.05)})
    diff = build_jurisdiction_diff("obscure query", use_llm=False)
    assert diff["evidence"] == []
    assert diff["india"]["evidence_strength"] == "NONE"
    assert diff["india"]["risk_category"] == "INSUFFICIENT"
    assert validate_diff_response(diff) == []


# TEST 3 — International side is always country-dependent, never an invented number.
def test_international_is_country_dependent():
    diff = build_jurisdiction_diff("any formulation", use_llm=False)
    assert diff["international"]["risk_category"] == "COUNTRY_DEPENDENT"
    assert diff["international"]["risk_score"] is None
    assert diff["international"]["evidence"] == []


# TEST 4 — Full Jurisdiction Diff query has both sections + all comparison categories.
def test_full_jurisdiction_diff_shape(monkeypatch):
    monkeypatch.setattr(rules, "find_prior_art", lambda *a, **k: {"results": _matches(0.5)})
    diff = build_jurisdiction_diff("ashwagandha and turmeric formulation", use_llm=False)
    assert "india" in diff and "international" in diff
    areas = {d["area"] for d in diff["differences"]}
    for expected in ("Patentability / Prior art", "Traditional Knowledge", "TKDL",
                     "Disclosure", "Biodiversity / ABS", "Evidence"):
        assert expected in areas
    assert diff["common_considerations"] and diff["limitations"]
    assert diff["disclaimer"] == "AI-assisted information, not legal advice."


# TEST 5 — Missing evidence is handled cleanly (empty query -> no crash).
def test_missing_evidence_and_empty_query():
    diff = build_jurisdiction_diff("", use_llm=False)
    assert diff["evidence"] == []
    assert diff["india"]["risk_category"] == "INSUFFICIENT"
    assert isinstance(diff["limitations"], list) and diff["limitations"]


# TEST 6 — Ollama unavailable: engine still returns a deterministic explanation.
def test_ollama_unavailable_falls_back(monkeypatch):
    monkeypatch.setattr(rules, "find_prior_art", lambda *a, **k: {"results": _matches(0.5)})

    def _boom(*a, **k):
        raise RuntimeError("Ollama not running")

    import app.llm.client as llm_client
    monkeypatch.setattr(llm_client, "call_llm", _boom)

    diff = build_jurisdiction_diff("herbs for fever", use_llm=True)
    assert diff["ai_unavailable"] is True
    wc = diff["what_changes"]
    assert wc["india"] and wc["international"] and wc["main_difference"]
    assert validate_diff_response(diff) == []


# TEST 7 — Invalid input is rejected cleanly by the API layer.
def test_invalid_input_rejected():
    with pytest.raises(HTTPException) as e1:
        _run(JurisdictionDiffRequest(query="x", jurisdiction="mars"))
    assert e1.value.status_code == 422
    with pytest.raises(HTTPException) as e2:
        _run(JurisdictionDiffRequest(query="", formulation="", ingredients=[], jurisdiction="diff"))
    assert e2.value.status_code == 422


# TEST 8 — International ML risk must remain null; validator rejects a tampered value.
def test_international_ml_risk_never_invented():
    diff = build_jurisdiction_diff("any", use_llm=False)
    assert diff["international"]["risk_score"] is None
    diff["international"]["risk_score"] = 42          # tamper
    errors = validate_diff_response(diff)
    assert any("International risk_score" in e for e in errors)


# Extra — validator catches fabricated (non-URL, non-marker) source URLs.
def test_validator_rejects_fabricated_url(monkeypatch):
    monkeypatch.setattr(rules, "find_prior_art", lambda *a, **k: {"results": _matches(0.5)})
    diff = build_jurisdiction_diff("herbs", use_llm=False)
    diff["evidence"][0]["source_url"] = "not-a-real-url"
    errors = validate_diff_response(diff)
    assert any("non-URL" in e for e in errors)
