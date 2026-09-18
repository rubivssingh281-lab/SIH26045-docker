"""
In-process relational knowledge graph for Ayurvedic IP / ABS / regulatory reasoning.

Dependency-free (pure-Python adjacency) so it stays deployable and fast. The graph
is curated and version-tracked in `data/knowledge_graph.json`; this module loads it,
answers traversal queries, and builds subgraphs for the agent and the UI. It never
invents nodes or edges — it only returns what the curated corpus contains.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)

_DATA = Path(__file__).parent / "data" / "knowledge_graph.json"

# Keyword hints that route a free-text formulation description to a category node.
_CATEGORY_HINTS: Dict[str, Tuple[str, ...]] = {
    "cat_classical": ("classical", "generic", "first schedule", "authoritative text", "traditional formulation", "shastric", "as per text"),
    "cat_proprietary": ("proprietary", "patent medicine", "brand", "trademark", "combination", "own name"),
    "cat_new_drug": ("new drug", "novel", "clinical", "new use", "new indication", "non-classical", "modified", "innovation", "efficacy"),
    "cat_phytopharma": ("phytopharmaceutical", "purified", "fraction", "extract", "standardized extract", "characterised", "isolated compound"),
    "cat_aahar": ("aahar", "food", "nutraceutical", "supplement", "dietary", "fssai", "beverage"),
    "cat_cosmetic": ("cosmetic", "beauty", "skincare", "cream", "cosmetics", "shampoo", "lotion", "hair oil"),
}

# Intent keywords -> seed node ids the agent should pull into the reasoning subgraph.
_INTENT_HINTS: Dict[str, Tuple[str, ...]] = {
    "ip_patent": ("patent", "patentab", "novelty", "invention", "inventive"),
    "ip_gi": ("geographical indication", " gi ", "origin", "region"),
    "ip_trademark": ("trademark", "trade mark", "brand", "logo", "mark"),
    "ip_design": ("design", "ornamental", "shape", "packaging design"),
    "ip_copyright": ("copyright", "label", "manual", "artwork", "literary"),
    "ip_pvp": ("plant variety", "cultivar", "seed", "variety protection"),
    "ip_trade_secret": ("trade secret", "confidential", "know-how", "secret recipe"),
    "concept_tkdl": ("tkdl", "prior art", "traditional knowledge digital"),
    "concept_3p": ("3(p)", "section 3p", "traditional knowledge bar"),
    "ob_abs_approval": ("abs", "benefit sharing", "biological resource", "biodiversity", "nagoya", "access"),
    "ob_source_disclosure": ("disclosure", "source", "geographic origin", "10(4)"),
    "ob_ad_claims": ("advertis", "magic remedies", "claim", "marketing"),
    "ob_clinical_evidence": ("clinical", "safety", "efficacy", "trial"),
}


class KnowledgeGraph:
    def __init__(self, path: Path = _DATA):
        with path.open("r", encoding="utf-8") as fh:
            raw = json.load(fh)
        self.version: str = raw.get("version", "")
        self.last_verified: str = raw.get("last_verified", "")
        self.nodes: Dict[str, dict] = {n["id"]: n for n in raw.get("nodes", [])}
        self.edges: List[dict] = raw.get("edges", [])
        # adjacency: id -> list of (neighbor_id, relation, direction)
        self._out: Dict[str, List[Tuple[str, str]]] = {}
        self._in: Dict[str, List[Tuple[str, str]]] = {}
        for e in self.edges:
            self._out.setdefault(e["source"], []).append((e["target"], e["relation"]))
            self._in.setdefault(e["target"], []).append((e["source"], e["relation"]))

    # --- basic access -------------------------------------------------------
    def get_node(self, node_id: str) -> Optional[dict]:
        return self.nodes.get(node_id)

    def neighbors(self, node_id: str, direction: str = "both") -> List[Tuple[str, str]]:
        out = []
        if direction in ("out", "both"):
            out += self._out.get(node_id, [])
        if direction in ("in", "both"):
            out += self._in.get(node_id, [])
        return out

    # --- routing ------------------------------------------------------------
    def classify_category(self, text: str) -> Tuple[Optional[str], List[str]]:
        """Best-match formulation category id + any other candidates (deterministic)."""
        t = (text or "").lower()
        scored: List[Tuple[int, str]] = []
        for cid, hints in _CATEGORY_HINTS.items():
            score = sum(1 for h in hints if h in t)
            if score:
                scored.append((score, cid))
        scored.sort(reverse=True)
        if not scored:
            return None, []
        best = scored[0][1]
        others = [c for _, c in scored[1:]]
        return best, others

    def detect_intents(self, text: str) -> List[str]:
        """Seed node ids implied by the query wording (IP types, obligations, concepts)."""
        t = f" {(text or '').lower()} "
        hits = []
        for nid, hints in _INTENT_HINTS.items():
            if any(h in t for h in hints):
                hits.append(nid)
        return hits

    # --- traversal ----------------------------------------------------------
    def implications_for(self, category_id: str, jurisdiction: str = "India") -> List[dict]:
        """
        One-hop implications of a formulation category: the statutes, IP types,
        concepts and obligations directly linked to it, each with the connecting
        relation and the target node's citation.
        """
        results = []
        for target_id, relation in self._out.get(category_id, []):
            node = self.nodes.get(target_id)
            if not node:
                continue
            results.append({
                "relation": relation,
                "node_id": target_id,
                "label": node["label"],
                "type": node["type"],
                "citation": node.get("citation", ""),
                "url": node.get("url", ""),
                "summary": node.get("summary", ""),
                "verified": node.get("verified", False),
            })
        return results

    def subgraph_for(self, seed_ids: Iterable[str], hops: int = 2,
                     jurisdiction: Optional[str] = None) -> Dict[str, Any]:
        """
        BFS subgraph around the seed nodes up to `hops`. If `jurisdiction` is given,
        nodes tagged with the *other* single jurisdiction are pruned (nodes with an
        empty/shared jurisdiction are always kept).
        """
        seeds = [s for s in seed_ids if s in self.nodes]
        visited: Set[str] = set(seeds)
        frontier = list(seeds)
        for _ in range(max(0, hops)):
            nxt: List[str] = []
            for nid in frontier:
                for neigh, _rel in self.neighbors(nid, "both"):
                    if neigh not in visited:
                        visited.add(neigh)
                        nxt.append(neigh)
            frontier = nxt

        def _keep(nid: str) -> bool:
            if not jurisdiction:
                return True
            jn = self.nodes[nid].get("jurisdiction", "")
            return jn in ("", jurisdiction)

        keep_nodes = {nid for nid in visited if _keep(nid)}
        nodes = [self.nodes[nid] for nid in keep_nodes]
        edges = [e for e in self.edges if e["source"] in keep_nodes and e["target"] in keep_nodes]
        return {"nodes": nodes, "edges": edges,
                "version": self.version, "last_verified": self.last_verified}

    def search(self, query: str, limit: int = 8) -> List[dict]:
        """Keyword search over node labels/summaries; returns matched nodes."""
        t = (query or "").lower().strip()
        if not t:
            return []
        terms = [w for w in t.replace("/", " ").split() if len(w) > 2]
        scored: List[Tuple[int, dict]] = []
        for node in self.nodes.values():
            hay = f"{node['label']} {node.get('summary','')} {node.get('citation','')}".lower()
            score = sum(1 for w in terms if w in hay)
            if score:
                scored.append((score, node))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [n for _, n in scored[:limit]]


_graph: Optional[KnowledgeGraph] = None


def get_graph() -> KnowledgeGraph:
    global _graph
    if _graph is None:
        _graph = KnowledgeGraph()
    return _graph
