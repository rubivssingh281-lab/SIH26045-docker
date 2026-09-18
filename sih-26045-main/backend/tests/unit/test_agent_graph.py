"""
Knowledge-graph + agentic-orchestrator tests. Retrieval and the LLM are stubbed so
the deterministic reasoning is tested without a live ChromaDB / Ollama.
"""
import pytest

from app.graph.graph_store import get_graph
from app.agent import tools
from app.agent.orchestrator import run_agent


def _ev(*scores):
    return {"results": [
        {"score": s, "text": f"Traditional decoction record {i} for fever.",
         "metadata": {"formulation_id": f"F{i:03d}", "title": f"Record {i}", "url": ""}}
        for i, s in enumerate(scores, start=1)
    ]}


@pytest.fixture(autouse=True)
def _no_retrieval(monkeypatch):
    monkeypatch.setattr(tools, "find_prior_art", lambda *a, **k: {"results": []})


# --- graph ------------------------------------------------------------------
def test_graph_loads_and_has_corpus():
    g = get_graph()
    assert g.version and g.nodes and g.edges
    assert "cat_classical" in g.nodes and "concept_3p" in g.nodes


def test_graph_classifies_and_detects_intents():
    g = get_graph()
    best, _ = g.classify_category("classical formulation from a First-Schedule authoritative text")
    assert best == "cat_classical"
    intents = g.detect_intents("can I get a patent and what about ABS benefit sharing")
    assert "ip_patent" in intents and "ob_abs_approval" in intents


def test_graph_implications_and_jurisdiction_filter():
    g = get_graph()
    impl = g.implications_for("cat_classical", "India")
    rels = {i["relation"] for i in impl}
    assert "BARRED_BY" in rels and "DEFENDED_BY" in rels
    sub = g.subgraph_for(["treaty_trips"], hops=1, jurisdiction="International")
    assert all(n.get("jurisdiction", "") in ("", "International") for n in sub["nodes"])


# --- agent ------------------------------------------------------------------
def test_agent_classical_formulation(monkeypatch):
    monkeypatch.setattr(tools, "find_prior_art", lambda *a, **k: _ev(0.6))
    res = run_agent("Is my classical churna patentable and is there TKDL prior art?",
                    jurisdiction="India", formulation="classical formulation per authoritative text",
                    use_llm=False)
    assert res["classification"]["matched"] is True
    assert res["graph_facts"]                       # applicable rules gathered
    assert res["citations"]                         # cited
    assert res["abstained"] is False
    assert res["disclaimer"].startswith("This is an AI-assisted")
    assert len(res["trace"]["steps"]) >= 5
    # every graph citation is non-empty; evidence urls are http or the marker
    assert all(c["citation"] for c in res["citations"] if c["type"] == "graph")


def test_agent_abstains_out_of_scope():
    res = run_agent("what is the weather today", jurisdiction="India", use_llm=False)
    assert res["abstained"] is True
    assert "Insufficient authoritative evidence" in res["answer"]
    assert res["confidence"]["band"] in ("INSUFFICIENT", "LOW")


def test_agent_ollama_unavailable_fallbacks(monkeypatch):
    monkeypatch.setattr(tools, "find_prior_art", lambda *a, **k: _ev(0.5))
    import app.llm.client as llm_client
    monkeypatch.setattr(llm_client, "call_llm", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("down")))
    res = run_agent("patentability of ashwagandha formulation", jurisdiction="India", use_llm=True)
    assert res["ai_unavailable"] is True
    assert res["answer"] and not res["abstained"]


def test_agent_international_jurisdiction_scoped():
    res = run_agent("international patent filing via PCT for a herbal formulation",
                    jurisdiction="International", use_llm=False)
    assert res["jurisdiction"] == "International"
    assert all(n.get("jurisdiction", "") in ("", "International") for n in res["subgraph"]["nodes"])


def test_agent_radar_axes(monkeypatch):
    monkeypatch.setattr(tools, "find_prior_art", lambda *a, **k: _ev(0.6))
    res = run_agent("classical churna patent, TKDL and ABS", jurisdiction="India",
                    formulation="classical formulation per authoritative text", use_llm=False)
    radar = res["radar"]
    keys = [a["key"] for a in radar]
    assert keys == ["patent", "tkdl", "tk", "abs", "disclosure", "regulatory"]
    assert all(0.0 <= a["score"] <= 1.0 for a in radar)
    # classical + ABS query should score high on TK and ABS
    by_key = {a["key"]: a["score"] for a in radar}
    assert by_key["tk"] >= 0.9 and by_key["abs"] >= 0.9


def test_agent_no_fabricated_urls(monkeypatch):
    monkeypatch.setattr(tools, "find_prior_art", lambda *a, **k: _ev(0.5))
    res = run_agent("patent and GI for turmeric formulation", jurisdiction="India", use_llm=False)
    for c in res["citations"]:
        url = c["source_url"]
        assert url == "" or url.startswith(("http://", "https://"))
