import uuid
from typing import List, Dict, Any
try:
    import chromadb
except ImportError:  # The API can still run in evidence-degraded mode.
    chromadb = None
from app.rag.embeddings import embed_text

class VectorStore:
    def __init__(self, collection_name: str = "default"):
        self.collection_name = collection_name
        if chromadb is None:
            raise RuntimeError("chromadb is not installed")
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def query(self, text: str, limit: int = 5, jurisdiction: str = None) -> Dict[str, Any]:
        try:
            query_emb = embed_text(text)["embedding"]
            
            kwargs = {
                "query_embeddings": [query_emb],
                "n_results": limit
            }
            if jurisdiction:
                kwargs["where"] = {"jurisdiction": jurisdiction}
                
            results = self.collection.query(**kwargs)
            
            formatted_results = []
            if results and results.get('documents') and results['documents'][0]:
                docs = results['documents'][0]
                metadatas = results['metadatas'][0] if results.get('metadatas') else []
                distances = results['distances'][0] if results.get('distances') else []
                
                for i in range(len(docs)):
                    # Chroma returns distances. Cosine distance = 1 - Cosine similarity
                    distance = distances[i] if i < len(distances) else 0.0
                    score = 1.0 - distance
                    formatted_results.append({
                        "score": score,
                        "text": docs[i],
                        "metadata": metadatas[i] if i < len(metadatas) else {}
                    })
                    
            return {"query": text, "limit": limit, "documents": formatted_results}
        except Exception:
            return {"query": text, "limit": limit, "documents": []}

    def count(self) -> int:
        """Number of documents currently in the collection."""
        try:
            return self.collection.count()
        except Exception:
            return 0

    def add_with_embeddings(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]] | None = None,
    ) -> Dict[str, Any]:
        """
        Upsert documents using precomputed embedding vectors.

        Used to load the ML team's already-generated corpus embeddings
        (e.g. Stage 16 formulation_embeddings) without re-embedding, so the
        vectors in ChromaDB are byte-for-byte the ones the retrieval system
        was evaluated on. Idempotent: re-running replaces records with the
        same id rather than raising or duplicating them.
        """
        if not ids:
            return {"upserted": 0}

        metadatas = metadatas or [{} for _ in ids]
        clean_metadatas = [
            {k: v for k, v in meta.items() if isinstance(v, (str, int, float, bool))}
            for meta in metadatas
        ]

        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            metadatas=clean_metadatas,
            documents=documents,
        )
        return {"upserted": len(ids)}

    def add(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        documents: list of dicts with 'text' and optional 'metadata'
        """
        if not documents:
            return {"added": 0}
            
        ids = []
        embeddings = []
        metadatas = []
        texts = []
        
        for doc in documents:
            text = doc.get("text", "")
            if text:
                emb = embed_text(text)["embedding"]
                ids.append(str(uuid.uuid4()))
                embeddings.append(emb)
                # metadata cannot have complex types in Chroma (only string, int, float, bool)
                clean_metadata = {k: v for k, v in doc.get("metadata", {}).items() if isinstance(v, (str, int, float, bool))}
                metadatas.append(clean_metadata)
                texts.append(text)
                
        if ids:
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=texts
            )
            
        return {"added": len(ids)}
