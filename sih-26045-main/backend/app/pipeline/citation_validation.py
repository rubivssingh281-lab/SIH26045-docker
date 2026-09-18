from typing import List, Dict, Any
from app.rag.keyword_boost import get_keyword_scores

# Calibrated minimum retrieval relevance for a citation to count as supporting
# evidence. Mirrors the ML team's `minimum_evidence_threshold` in
# ml_models/models/risk_scoring/risk_thresholds.json.
MIN_EVIDENCE_RELEVANCE = 0.3

def validate_citations(
    citations: List[Dict[str, Any]],
    facts: List[Dict[str, Any]] = None,
    query_text: str = None,
) -> List[Dict[str, Any]]:
    """
    Validates that the provided citations are relevant to the case.
    Uses BM25 scoring to ensure citations meet a minimum relevance threshold.

    Validation prefers the retrieval relevance score already computed by the ML
    hybrid search (each match's ``score``), thresholded at
    ``MIN_EVIDENCE_RELEVANCE`` (the ML team's calibrated
    ``minimum_evidence_threshold``). BM25 over the tiny retrieved candidate set
    is not a usable signal on its own: with only a handful of documents, BM25
    IDF for common terms collapses toward zero, so re-scoring the candidates
    against each other marks everything invalid regardless of true relevance.

    When candidates carry no retrieval ``score`` (e.g. externally supplied
    citations), it falls back to BM25 against ``query_text`` (the case
    title/description). The extracted facts alone are not a usable query: the
    boolean rule-signal keys (e.g. ``uses_biological_resource=True``) share no
    vocabulary with evidence prose.
    """
    if not citations:
        return []

    # If retrieval relevance scores are present, use them directly.
    if any("score" in c for c in citations):
        validated = []
        for c in citations:
            c_copy = dict(c)
            relevance = float(c.get("score", 0.0) or 0.0)
            c_copy["validation_score"] = relevance
            c_copy["is_valid"] = bool(relevance >= MIN_EVIDENCE_RELEVANCE)
            validated.append(c_copy)
        return validated

    query = (query_text or "").strip()
    if not query and facts:
        # Legacy fallback: synthesize a query from fact values + keys.
        query = " ".join([str(f.get("value", "")) + " " + f.get("key", "") for f in facts])

    if not query:
        # Nothing to validate against; mark all valid rather than silently failing.
        for c in citations:
            c["is_valid"] = True
        return citations

    texts = [c.get("text", "") for c in citations]

    scores = get_keyword_scores(query, texts)

    validated = []
    for i, c in enumerate(citations):
        c_copy = dict(c)
        # Assume valid if score > 0.1, convert to native bool
        c_copy["is_valid"] = bool(scores[i] > 0.1) if i < len(scores) else True
        c_copy["validation_score"] = float(scores[i]) if i < len(scores) else 1.0
        validated.append(c_copy)

    return validated
