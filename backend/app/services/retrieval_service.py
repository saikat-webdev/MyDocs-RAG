from typing import List
from app.core.config import settings
from app.core.logging import logger
from app.schemas.chat import SourceChunk
from app.services.embedding_service import get_embedding_service
from app.services.vector_service import get_vector_service

class RetrievalService:
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.vector_service = get_vector_service()

    def retrieve_relevant_chunks(
        self,
        document_id: str,
        query: str,
        top_k: int = None,
        similarity_threshold: float = None
    ) -> List[SourceChunk]:
        """
        Generates query embedding, queries ChromaDB with strict document isolation,
        calculates similarity scores, and filters by threshold.
        """
        k = top_k or settings.TOP_K
        threshold = similarity_threshold if similarity_threshold is not None else settings.SIMILARITY_THRESHOLD

        logger.info(f"Retrieving top {k} chunks for doc {document_id} with query: '{query[:60]}...'")
        query_vector = self.embedding_service.embed_query(query)

        results = self.vector_service.query_vectors(
            document_id=document_id,
            query_embedding=query_vector,
            top_k=k
        )

        source_chunks: List[SourceChunk] = []

        ids_list = results.get("ids", [[]])[0]
        docs_list = results.get("documents", [[]])[0]
        metas_list = results.get("metadatas", [[]])[0]
        distances_list = results.get("distances", [[]])[0]

        for chunk_id, text, metadata, distance in zip(ids_list, docs_list, metas_list, distances_list):
            # For cosine distance d in ChromaDB: similarity = 1 - distance
            # If distance is negative or > 1 due to floating precision, clamp
            sim_score = max(0.0, min(1.0, 1.0 - float(distance)))
            
            logger.debug(f"Chunk {chunk_id} similarity score: {sim_score:.4f} (threshold: {threshold})")

            if sim_score >= threshold:
                source_chunks.append(SourceChunk(
                    document_id=document_id,
                    chunk_id=chunk_id,
                    chunk_index=metadata.get("chunk_index", 0),
                    filename=metadata.get("filename", ""),
                    page_number=metadata.get("page_number", 1),
                    file_type=metadata.get("file_type", ""),
                    text=text,
                    similarity_score=round(sim_score, 4)
                ))

        logger.info(f"Retrieved {len(source_chunks)} relevant chunks above threshold {threshold} for doc {document_id}")
        return source_chunks

retrieval_service = RetrievalService()
