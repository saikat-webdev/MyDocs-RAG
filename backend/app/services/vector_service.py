import threading
from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings
from app.core.logging import logger

COLLECTION_NAME = "mydocs_documents"

class VectorService:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        persist_dir = Path(settings.CHROMA_PERSIST_DIRECTORY)
        persist_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Initializing ChromaDB PersistentClient at {persist_dir}")
        self.client = chromadb.PersistentClient(
            path=str(persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"ChromaDB collection '{COLLECTION_NAME}' ready.")

    @classmethod
    def get_instance(cls) -> "VectorService":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def insert_chunks(
        self,
        document_id: str,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]]
    ) -> int:
        """Insert or replace document chunks in ChromaDB with metadata."""
        if not chunks:
            return 0
        
        # First remove any existing vectors for this document to prevent duplicates
        self.delete_document_vectors(document_id)

        ids = [chunk["chunk_id"] for chunk in chunks]
        documents = [chunk["text"] for chunk in chunks]
        metadatas = [
            {
                "document_id": chunk["document_id"],
                "chunk_id": chunk["chunk_id"],
                "chunk_index": int(chunk["chunk_index"]),
                "filename": str(chunk["filename"]),
                "file_type": str(chunk.get("file_type", "")),
                "page_number": int(chunk.get("page_number", 1))
            }
            for chunk in chunks
        ]

        # Insert in batches of 500 to prevent oversized payload
        batch_size = 500
        for i in range(0, len(chunks), batch_size):
            end = i + batch_size
            self.collection.add(
                ids=ids[i:end],
                documents=documents[i:end],
                embeddings=embeddings[i:end],
                metadatas=metadatas[i:end]
            )

        logger.info(f"Inserted {len(chunks)} vectors into ChromaDB for doc {document_id}")
        return len(chunks)

    def delete_document_vectors(self, document_id: str) -> int:
        """Delete all vector embeddings belonging to a specific document ID."""
        try:
            # Query existing IDs for this document
            existing = self.collection.get(
                where={"document_id": document_id},
                include=[]
            )
            existing_ids = existing.get("ids", [])
            if existing_ids:
                self.collection.delete(ids=existing_ids)
                logger.info(f"Deleted {len(existing_ids)} vectors for document {document_id}")
                return len(existing_ids)
            return 0
        except Exception as e:
            logger.warning(f"Error during vector deletion for {document_id}: {e}")
            return 0

    def query_vectors(
        self,
        document_id: str,
        query_embedding: List[float],
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Query vectors strictly filtered by document_id.
        Isolation guarantee: Only searches chunks belonging to document_id.
        """
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"document_id": document_id},
            include=["documents", "metadatas", "distances"]
        )
        return results

    def get_document_chunks_count(self, document_id: str) -> int:
        try:
            res = self.collection.get(where={"document_id": document_id}, include=[])
            return len(res.get("ids", []))
        except Exception:
            return 0

def get_vector_service() -> VectorService:
    return VectorService.get_instance()
