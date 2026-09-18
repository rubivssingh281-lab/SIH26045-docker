"""
Ingest the ML team's Stage 16 TKDL formulation corpus into the backend
ChromaDB `tkdl_prior_art` collection used by app.rag.prior_art.find_prior_art.

This is the single wiring point between the offline ML/retrieval pipeline and
the live FastAPI backend. It loads the *precomputed* embeddings the retrieval
system was evaluated on (694 formulations, all-MiniLM-L6-v2, 384-dim) rather
than re-embedding, per the dataset handoff note ("Do NOT rebuild embeddings").

Inputs (from ml_models/data/IP_SAKTI_FINAL_DATASET/retrieval_stage16/):
  - formulation_embeddings_stage16.npy   (694, 384) float32, row order == vector_index
  - vector_metadata_stage16.csv          formulation_id, title, vector_index
  - semantic_documents_stage16.csv       formulation_id, title, document

Run from the backend/ directory so ChromaDB resolves to backend/chroma_db:

    cd backend
    python -m scripts.ingest_tkdl_corpus
    # or point at a different corpus location:
    python -m scripts.ingest_tkdl_corpus --stage16-dir /path/to/retrieval_stage16

Idempotent: re-running upserts by formulation_id.

Provenance / honesty note: these are TKDL prior-art formulation records for
evidence retrieval only. They are NOT patent decisions or patentability
outcomes and must not be presented as such.
"""
from __future__ import annotations

import argparse
import csv
import os
import sys

# Allow running as `python scripts/ingest_tkdl_corpus.py` from backend/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DEFAULT_STAGE16_DIR = os.path.normpath(
    os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "..",
        "ml_models", "data", "IP_SAKTI_FINAL_DATASET", "retrieval_stage16",
    )
)

EMBEDDINGS_FILE = "formulation_embeddings_stage16.npy"
METADATA_FILE = "vector_metadata_stage16.csv"
DOCUMENTS_FILE = "semantic_documents_stage16.csv"

COLLECTION_NAME = "tkdl_prior_art"


def _load_documents(path: str) -> dict[str, str]:
    """formulation_id -> semantic document text."""
    docs: dict[str, str] = {}
    # csv handles the quoted, multi-line `document` field correctly.
    with open(path, "r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            fid = (row.get("formulation_id") or "").strip()
            if fid:
                docs[fid] = row.get("document") or ""
    return docs


def _load_metadata(path: str) -> list[dict[str, str]]:
    """Ordered rows of {formulation_id, title, vector_index}."""
    rows: list[dict[str, str]] = []
    with open(path, "r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(
                {
                    "formulation_id": (row.get("formulation_id") or "").strip(),
                    "title": (row.get("title") or "").strip(),
                    "vector_index": (row.get("vector_index") or "").strip(),
                }
            )
    return rows


def ingest(stage16_dir: str = DEFAULT_STAGE16_DIR, batch_size: int = 256) -> dict:
    try:
        import numpy as np
    except ImportError as exc:  # pragma: no cover - environment guard
        raise RuntimeError("numpy is required for corpus ingestion") from exc

    from app.rag.prior_art import get_vector_store

    emb_path = os.path.join(stage16_dir, EMBEDDINGS_FILE)
    meta_path = os.path.join(stage16_dir, METADATA_FILE)
    docs_path = os.path.join(stage16_dir, DOCUMENTS_FILE)

    for required in (emb_path, meta_path, docs_path):
        if not os.path.exists(required):
            raise FileNotFoundError(
                f"Corpus file not found: {required}\n"
                f"Pass --stage16-dir pointing at retrieval_stage16/."
            )

    embeddings = np.load(emb_path)
    metadata = _load_metadata(meta_path)
    documents = _load_documents(docs_path)

    if embeddings.shape[0] != len(metadata):
        raise ValueError(
            f"Row mismatch: {embeddings.shape[0]} embeddings vs "
            f"{len(metadata)} metadata rows. Refusing to ingest misaligned data."
        )

    store = get_vector_store()  # collection: tkdl_prior_art

    ids: list[str] = []
    vectors: list[list[float]] = []
    texts: list[str] = []
    metas: list[dict] = []
    skipped_no_doc = 0

    for meta in metadata:
        fid = meta["formulation_id"]
        vector_index = meta["vector_index"]
        try:
            idx = int(vector_index)
        except (TypeError, ValueError):
            continue
        if not (0 <= idx < embeddings.shape[0]):
            continue

        text = documents.get(fid)
        if not text:
            # Fall back to title-only text so the record is still retrievable.
            skipped_no_doc += 1
            text = f"formulation {meta['title']} ({fid})"

        ids.append(fid)
        vectors.append(embeddings[idx].astype("float32").tolist())
        texts.append(text)
        metas.append(
            {
                "formulation_id": fid,
                "title": meta["title"],
                "source": "TKDL",
                "corpus": "stage16",
                "citation": f"TKDL formulation record {fid}",
                "vector_index": idx,
            }
        )

    total = 0
    for start in range(0, len(ids), batch_size):
        end = start + batch_size
        result = store.add_with_embeddings(
            ids=ids[start:end],
            embeddings=vectors[start:end],
            documents=texts[start:end],
            metadatas=metas[start:end],
        )
        total += result.get("upserted", 0)

    return {
        "collection": COLLECTION_NAME,
        "ingested": total,
        "records_without_doc_text": skipped_no_doc,
        "collection_count": store.count(),
        "embedding_dim": int(embeddings.shape[1]),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest Stage 16 TKDL corpus into ChromaDB.")
    parser.add_argument(
        "--stage16-dir",
        default=DEFAULT_STAGE16_DIR,
        help="Path to the retrieval_stage16 directory.",
    )
    args = parser.parse_args()

    print(f"Ingesting TKDL corpus from:\n  {args.stage16_dir}\n")
    summary = ingest(args.stage16_dir)
    print("Ingestion complete:")
    for key, value in summary.items():
        print(f"  {key}: {value}")
    print(
        "\nNote: these are TKDL prior-art records for evidence retrieval only — "
        "not patent decisions or patentability outcomes."
    )


if __name__ == "__main__":
    main()
