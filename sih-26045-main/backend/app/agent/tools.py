"""
Deterministic tools the agent orchestrates. Each tool wraps an EXISTING capability
(knowledge graph, TKDL retrieval, jurisdiction rules) and returns structured,
citation-ready data. No tool invents authority; the LLM never runs inside a tool.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.graph.graph_store import get_graph
from app.rag.prior_art import find_prior_art
from app.pipeline.citation_validation import validate_citations

logger = logging.getLogger(__name__)

_UNVERIFIED = "Source unavailable / not verified"


def classify_formulation(query: str, formulation: str = "") -> Dict[str, Any]:
    """Route the described product to a formulation category (deterministic graph hints)."""
    g = get_graph()
    text = f"{query} {formulation}".strip()
    best, others = g.classify_category(text)
    if not best:
        return {"category_id": None, "label": None, "citation": "", "candidates": [], "matched": False}
    node = g.get_node(best) or {}
    return {
        "category_id": best,
        "label": node.get("label"),
        "citation": node.get("citation", ""),
        "summary": node.get("summary", ""),
        "candidates": [g.get_node(c)["label"] for c in others if g.get_node(c)],
        "matched": True,
    }


def query_graph(category_id: Optional[str], intents: List[str],
                jurisdiction: str = "India", query: str = "") -> Dict[str, Any]:
    """
    Traverse the knowledge graph: gather the applicable statutes / IP types /
    obligations for the category and detected intents, plus a reasoning subgraph.
    """
    g = get_graph()
    seeds: List[str] = []
    if category_id:
        seeds.append(category_id)
    seeds.extend(intents)
    if not seeds:
        seeds = [n["id"] for n in g.search(query, limit=4)]

    facts: List[Dict[str, Any]] = []
    seen = set()

    def _add(relation: str, node_id: str):
        node = g.get_node(node_id)
        if not node or node_id in seen:
            return
        # jurisdiction filter: keep shared nodes + the selected jurisdiction
        jn = node.get("jurisdiction", "")
        if jn and jn != jurisdiction:
            return
        seen.add(node_id)
        facts.append({
            "relation": relation,
            "node_id": node_id,
            "statement": node.get("summary", "") or node.get("label", ""),
            "label": node.get("label", ""),
            "type": node.get("type", ""),
            "citation": node.get("citation", "") or _UNVERIFIED,
            "url": node.get("url", ""),
            "verified": bool(node.get("verified", False)),
        })

    if category_id:
        for impl in g.implications_for(category_id, jurisdiction):
            _add(impl["relation"], impl["node_id"])
    for nid in intents:
        _add("RELEVANT", nid)
        for neigh, rel in g.neighbors(nid, "out"):
            _add(rel, neigh)

    subgraph = g.subgraph_for(seeds, hops=2, jurisdiction=jurisdiction)
    return {"facts": facts, "subgraph": subgraph, "seeds": seeds}


def retrieve_evidence(query: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Existing hybrid TKDL retrieval + citation validation, mapped to citation shape."""
    if not (query or "").strip():
        return []
    matches = find_prior_art(query, limit=limit).get("results", [])
    validated = validate_citations(matches, query_text=query)
    out = []
    for item in validated:
        if not item.get("is_valid"):
            continue
        meta = item.get("metadata", {}) or {}
        fid = meta.get("formulation_id") or meta.get("id") or ""
        title = meta.get("title") or meta.get("source") or "TKDL formulation record"
        excerpt = (item.get("text", "") or "").strip()
        url = str(meta.get("url", "") or "").strip()
        out.append({
            "title": f"{title} ({fid})" if fid else title,
            "excerpt": (excerpt[:280] + "…") if len(excerpt) > 280 else excerpt,
            "citation": meta.get("citation") or f"TKDL formulation record {fid}".strip(),
            "url": url or _UNVERIFIED,
            "score": round(float(item.get("score", 0.0) or 0.0), 4),
        })
    return out
