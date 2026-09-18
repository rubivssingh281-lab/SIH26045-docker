from typing import Dict, Any
from app.rag.prior_art import find_prior_art

def retrieve_context(query: str, limit: int = 5) -> Dict[str, Any]:
    """
    Retrieves context using the hybrid search (vector + keyword) implementation.
    """
    if not query.strip():
        return {"query": query, "limit": limit, "results": []}
    return find_prior_art(query=query, limit=limit)
