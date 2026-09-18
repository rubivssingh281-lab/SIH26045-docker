from app.rag.prior_art import get_vector_store

def ingest_corpus(corpus_documents: list):
    """
    corpus_documents: list of dicts with 'text' and 'metadata'
    """
    store = get_vector_store()
    result = store.add(corpus_documents)
    return {"ingested": result.get("added", 0), "documents": corpus_documents or []}
