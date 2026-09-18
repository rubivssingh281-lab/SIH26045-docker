"""
Corpus ingestion entry point.

The real work lives in scripts/ingest_tkdl_corpus.py, which loads the ML team's
Stage 16 TKDL formulation corpus (precomputed embeddings) into the backend
ChromaDB `tkdl_prior_art` collection. Run from the backend/ directory:

    cd backend
    python -m scripts.ingest_corpus
"""
from scripts.ingest_tkdl_corpus import ingest


def ingest_corpus():
    summary = ingest()
    print("Corpus ingestion complete:")
    for key, value in summary.items():
        print(f"  {key}: {value}")
    return summary


if __name__ == "__main__":
    ingest_corpus()
