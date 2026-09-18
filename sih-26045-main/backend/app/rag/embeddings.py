import logging
from typing import Dict, Any

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

logger = logging.getLogger(__name__)

# Lazy initialization of the model
_model = None

def get_embedding_model():
    global _model
    if _model is None:
        if SentenceTransformer is None:
            raise RuntimeError("sentence_transformers is not installed.")
        logger.info("Loading sentence-transformers model...")
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model

def embed_text(text: str) -> Dict[str, Any]:
    """Generate an embedding vector for the given text."""
    model = get_embedding_model()
    # SentenceTransformer returns a numpy array, convert to list of floats
    embedding_vector = model.encode(text).tolist()
    
    return {"text": text, "embedding": embedding_vector}
