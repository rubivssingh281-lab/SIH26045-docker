"""
Agentic reasoning + knowledge-graph API.

POST /agent/query      -> multi-step, citation-grounded answer with a reasoning trace
GET  /graph            -> the full curated knowledge graph (for visualisation)
POST /graph/subgraph   -> a focused subgraph for a query or seed nodes

Never 500s the app when Ollama is down: the orchestrator falls back to a
deterministic composer and marks `ai_unavailable`.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agent.orchestrator import run_agent
from app.graph.graph_store import get_graph

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Agent & Graph"])


class AgentQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    jurisdiction: str = Field("India", description="'India' or 'International'")
    formulation: str = Field("")
    ingredients: List[str] = Field(default_factory=list)


@router.post("/agent/query")
def agent_query(payload: AgentQueryRequest):
    if not payload.query.strip():
        raise HTTPException(422, "A non-empty query is required.")
    try:
        return run_agent(
            query=payload.query,
            jurisdiction=payload.jurisdiction,
            formulation=payload.formulation,
            ingredients=payload.ingredients,
        )
    except Exception as exc:
        logger.error("Agent run failed: %s", exc)
        raise HTTPException(502, f"Agent reasoning failed: {exc}")


@router.get("/graph")
def get_full_graph():
    g = get_graph()
    return {
        "version": g.version,
        "last_verified": g.last_verified,
        "nodes": list(g.nodes.values()),
        "edges": g.edges,
    }


class SubgraphRequest(BaseModel):
    query: str = Field("")
    seeds: List[str] = Field(default_factory=list)
    jurisdiction: Optional[str] = None
    hops: int = Field(2, ge=1, le=3)


@router.post("/graph/subgraph")
def graph_subgraph(payload: SubgraphRequest):
    g = get_graph()
    seeds = [s for s in payload.seeds if g.get_node(s)]
    if not seeds and payload.query.strip():
        seeds = [n["id"] for n in g.search(payload.query, limit=5)]
    if not seeds:
        raise HTTPException(422, "Provide a query or valid seed node ids.")
    return g.subgraph_for(seeds, hops=payload.hops, jurisdiction=payload.jurisdiction)
