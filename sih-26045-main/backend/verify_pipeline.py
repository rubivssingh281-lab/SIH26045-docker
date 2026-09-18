import sys
import logging
from app.rag.embeddings import get_embedding_model, embed_text
from app.rag.vector_store import VectorStore
from app.rag.keyword_boost import get_keyword_scores

logging.basicConfig(level=logging.INFO)

def main():
    try:
        print("1. Testing Embeddings...")
        emb = embed_text("Ayurvedic formulation for headache using ginger")
        print(f"Embedding length: {len(emb['embedding'])}")
        
        print("\n2. Testing Vector Store (ChromaDB)...")
        store = VectorStore(collection_name="test_corpus")
        store.add([
            {"text": "Ginger is used for headaches", "metadata": {"source": "text1"}},
            {"text": "Turmeric is good for inflammation", "metadata": {"source": "text2"}},
        ])
        res = store.query("ginger for headache", limit=1)
        print(f"Query Result: {res['documents']}")
        
        print("\n3. Testing Keyword Boost (BM25)...")
        scores = get_keyword_scores("ginger headache", ["Ginger is used for headaches", "Turmeric is good"])
        print(f"BM25 Scores: {scores}")
        
        print("\nSUCCESS: All components loaded and executed correctly.")
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
