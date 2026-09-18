from typing import Dict, Any
from app.rag.vector_store import VectorStore
from app.rag.keyword_boost import get_keyword_scores

# In a real app, this would be a persistent store singleton or connected to DB
_global_store = None

def get_vector_store() -> VectorStore:
    global _global_store
    if _global_store is None:
        _global_store = VectorStore("tkdl_prior_art")
    return _global_store

def find_prior_art(query: str, limit: int = 5, jurisdiction: str = None) -> Dict[str, Any]:
    try:
        store = get_vector_store()
    except Exception:
        return {"query": query, "limit": limit, "results": []}
    
    # 1. Vector Search
    vector_results = store.query(query, limit=limit * 2, jurisdiction=jurisdiction) # Fetch more for re-ranking
    
    docs = vector_results.get("documents", [])
    if not docs:
        return {"query": query, "limit": limit, "results": []}
        
    # 2. Keyword Search Boost
    texts = [doc["text"] for doc in docs]
    kw_scores = get_keyword_scores(query, texts)
    
    final_results = []
    for i, doc in enumerate(docs):
        vec_score = doc["score"]
        kw_score = kw_scores[i]
        
        # 3. Hybrid Score (e.g. 70% vector, 30% keyword)
        hybrid_score = (vec_score * 0.7) + (kw_score * 0.3)
        
        final_results.append({
            "score": hybrid_score,
            "vector_score": vec_score,
            "keyword_score": kw_score,
            "text": doc["text"],
            "metadata": doc["metadata"]
        })
        
    final_results.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "query": query, 
        "limit": limit, 
        "results": final_results[:limit]
    }
