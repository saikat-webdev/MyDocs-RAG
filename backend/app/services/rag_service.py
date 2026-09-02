import json
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.core.config import settings
from app.core.logging import logger
from app.schemas.chat import SourceChunk, DebugInfo
from app.services.retrieval_service import retrieval_service
from app.services.ollama_service import ollama_service
from app.prompts.rag_prompt import RAG_SYSTEM_PROMPT, format_document_context, build_rag_prompt

class RAGService:
    def __init__(self):
        self.retrieval_service = retrieval_service
        self.ollama_service = ollama_service

    async def stream_rag_chat(
        self,
        document_id: str,
        question: str,
        conversation_history: List[dict] = None,
        debug_mode: bool = False
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes RAG Pipeline:
        1. Retrieve relevant chunks strictly for document_id
        2. Format context and prompt
        3. Yield initial metadata event (retrieved sources & debug info)
        4. Stream token events from Ollama (Qwen2.5 3B)
        5. Yield completion event
        """
        logger.info(f"Starting RAG query for doc {document_id}: '{question}'")

        # 1. Retrieve chunks
        relevant_chunks = self.retrieval_service.retrieve_relevant_chunks(
            document_id=document_id,
            query=question,
            top_k=settings.TOP_K,
            similarity_threshold=settings.SIMILARITY_THRESHOLD
        )

        context_str = format_document_context(relevant_chunks)
        full_prompt = build_rag_prompt(
            context_str=context_str,
            question=question,
            conversation_history=conversation_history
        )

        debug_info = None
        if debug_mode:
            debug_info = DebugInfo(
                question=question,
                retrieved_chunks=relevant_chunks,
                similarity_threshold=settings.SIMILARITY_THRESHOLD,
                top_k=settings.TOP_K,
                context_used=context_str,
                system_prompt=RAG_SYSTEM_PROMPT,
                model=settings.OLLAMA_MODEL,
                ollama_url=settings.OLLAMA_BASE_URL
            )

        # Yield metadata payload first
        yield {
            "type": "metadata",
            "sources": [chunk.model_dump() for chunk in relevant_chunks],
            "debug_info": debug_info.model_dump() if debug_info else None
        }

        # If no chunks were retrieved at all, we still pass through prompt to let model state "I couldn't find..."
        # 2. Stream generation
        full_response_text = []
        async for token in self.ollama_service.generate_stream(
            prompt=full_prompt,
            system=RAG_SYSTEM_PROMPT
        ):
            full_response_text.append(token)
            yield {
                "type": "token",
                "token": token
            }

        # Yield done event with complete answer
        yield {
            "type": "done",
            "full_text": "".join(full_response_text)
        }

rag_service = RAGService()
