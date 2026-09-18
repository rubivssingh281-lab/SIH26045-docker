import re
from typing import List
import numpy as np

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None


def _tokenize(text: str) -> List[str]:
    # Word-character tokens only. A bare str.split() keeps punctuation attached
    # ("fever." != "fever"), which silently breaks BM25 term matching.
    return re.findall(r"\w+", text.lower())

def get_keyword_scores(query: str, documents: List[str]) -> List[float]:
    """
    Computes BM25 scores for a list of documents given a query.
    Scores are loosely normalized to a 0-1 range based on the max score.
    """
    if not documents:
        return []
    
    if BM25Okapi is None:
        # Fallback if rank-bm25 is not installed
        return [0.0] * len(documents)
        
    tokenized_corpus = [_tokenize(doc) for doc in documents]
    bm25 = BM25Okapi(tokenized_corpus)
    tokenized_query = _tokenize(query)
    
    scores = bm25.get_scores(tokenized_query)
    
    # Normalize loosely to 0-1 range
    max_score = max(scores) if len(scores) > 0 and max(scores) > 0 else 1.0
    normalized_scores = [max(0.0, float(s / max_score)) for s in scores]
    
    return normalized_scores
