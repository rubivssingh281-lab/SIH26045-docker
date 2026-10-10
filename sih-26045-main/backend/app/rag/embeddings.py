import logging
from typing import Dict, Any

try:
    import torch
    torch.set_num_threads(1)
except Exception:
    pass

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

logger = logging.getLogger(__name__)

# Lazy initialization of the model
_model = None
_model_failed = False

def get_embedding_model():
    global _model, _model_failed
    if _model_failed:
        return None
    if _model is None:
        if SentenceTransformer is None:
            _model_failed = True
            logger.warning("sentence_transformers is not installed; using zero-vector fallback.")
            return None
        try:
            logger.info("Loading sentence-transformers model (all-MiniLM-L6-v2)...")
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            _model_failed = True
            logger.warning(f"Failed to load sentence-transformers model ({e}); falling back gracefully.")
            return None
    return _model

def embed_text(text: str) -> Dict[str, Any]:
    """Generate an embedding vector for the given text. Falls back safely if unavailable."""
    try:
        model = get_embedding_model()
        if model is not None:
            embedding_vector = model.encode(text).tolist()
            return {"text": text, "embedding": embedding_vector}
    except Exception as e:
        logger.warning(f"Embedding generation failed: {e}. Using zero-vector fallback.")

    # 384 dimensions matches all-MiniLM-L6-v2 so ChromaDB schema never throws dimension errors
    return {"text": text, "embedding": [0.0] * 384}
