from typing import List
from app.schemas.chat import SourceChunk

RAG_SYSTEM_PROMPT = """You are MyDocs, a document-based AI assistant. You answer questions using ONLY the provided document context.

Rules:
1. Do not invent information.
2. Do not use outside knowledge to fill missing information.
3. If the answer cannot be found in the provided context, clearly say: "I couldn't find this information in the document."
4. Answer the user's question directly.
5. When possible, mention the relevant page or source.
6. If the retrieved context contains conflicting information, mention the conflict.
7. Do not claim something is present in the document unless it is actually present in the provided context."""

def format_document_context(chunks: List[SourceChunk]) -> str:
    """Format retrieved source chunks into clear context blocks."""
    if not chunks:
        return "NO RELEVANT DOCUMENT CONTEXT FOUND."

    formatted_parts = []
    for idx, chunk in enumerate(chunks, start=1):
        page_str = f"Page {chunk.page_number}" if chunk.page_number else "Section"
        header = f"--- [Source Chunk {idx} | {chunk.filename} | {page_str}] ---"
        formatted_parts.append(f"{header}\n{chunk.text.strip()}\n")

    return "\n".join(formatted_parts)

def build_rag_prompt(
    context_str: str,
    question: str,
    conversation_history: List[dict] = None
) -> str:
    """Construct full prompt containing context, recent conversation history, and current question."""
    history_str = ""
    if conversation_history:
        history_lines = []
        for msg in conversation_history:
            role_label = "User" if msg.get("role") == "user" else "Assistant"
            history_lines.append(f"{role_label}: {msg.get('content', '')}")
        if history_lines:
            history_str = "PREVIOUS CONVERSATION HISTORY:\n" + "\n".join(history_lines) + "\n\n"

    prompt = f"""{history_str}DOCUMENT CONTEXT:
{context_str}

USER QUESTION: {question}

ASSISTANT ANSWER:"""
    return prompt
