import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.core.config import settings
from app.core.logging import logger
from app.db.database import get_db, SessionLocal
from app.db.models import Document, Conversation, Message
from app.schemas.chat import (
    ChatRequest,
    ConversationCreate,
    ConversationResponse,
    MessageResponse
)
from app.services.rag_service import rag_service

router = APIRouter(tags=["Chat & Conversations"])

# --- Conversation Endpoints ---

@router.post("/conversations", response_model=ConversationResponse)
def create_conversation(req: ConversationCreate, db: Session = Depends(get_db)):
    """Create a new conversation associated with a specific document."""
    doc = db.query(Document).filter(Document.id == req.document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    conv = Conversation(
        id=str(uuid.uuid4()),
        document_id=req.document_id,
        title=req.title or f"Chat with {doc.original_filename}"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv

@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(document_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List conversations, optionally filtered by document_id."""
    query = db.query(Conversation)
    if document_id:
        query = query.filter(Conversation.document_id == document_id)
    return query.order_by(Conversation.updated_at.desc()).all()

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Get single conversation and its messages."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    # Pre-parse sources if json string in DB
    return conv

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Delete conversation and its messages."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    db.delete(conv)
    db.commit()
    return {"success": True, "message": f"Conversation {conversation_id} deleted."}

@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: str, db: Session = Depends(get_db)):
    """List all messages in a conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
    results = []
    for msg in messages:
        sources_data = None
        if msg.sources:
            try:
                sources_data = json.loads(msg.sources)
            except Exception:
                sources_data = []
        results.append({
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "role": msg.role,
            "content": msg.content,
            "sources": sources_data,
            "created_at": msg.created_at
        })
    return results

# --- Streaming RAG Chat Endpoint ---

@router.post("/chat")
async def chat_stream(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Streaming Chat Endpoint using Server-Sent Events (SSE).
    Enforces document isolation: verifies conversation belongs to document.
    """
    # 1. Validate Document
    doc = db.query(Document).filter(Document.id == req.document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # 2. Get or create Conversation
    conv_id = req.conversation_id
    if conv_id:
        conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        # Strict isolation check
        if conv.document_id != req.document_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security Error: Conversation does not belong to the requested document."
            )
    else:
        conv = Conversation(
            id=str(uuid.uuid4()),
            document_id=req.document_id,
            title=req.question[:30] + ("..." if len(req.question) > 30 else "")
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        conv_id = conv.id

    # 3. Store User Message
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv_id,
        role="user",
        content=req.question
    )
    db.add(user_msg)
    conv.updated_at = datetime.utcnow()
    db.commit()

    # 4. Fetch recent history for context
    past_messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv_id, Message.id != user_msg.id)
        .order_by(Message.created_at.desc())
        .limit(settings.MAX_CHAT_HISTORY)
        .all()
    )
    past_messages.reverse()  # chronological order
    history_dicts = [{"role": m.role, "content": m.content} for m in past_messages]

    # 5. Define SSE generator
    async def event_generator():
        captured_sources = []
        assistant_full_text = []

        try:
            async for item in rag_service.stream_rag_chat(
                document_id=req.document_id,
                question=req.question,
                conversation_history=history_dicts,
                debug_mode=req.debug_mode
            ):
                item_type = item.get("type")
                if item_type == "metadata":
                    captured_sources = item.get("sources", [])
                    yield {
                        "event": "metadata",
                        "data": json.dumps({
                            "conversation_id": conv_id,
                            "sources": captured_sources,
                            "debug_info": item.get("debug_info")
                        })
                    }
                elif item_type == "token":
                    assistant_full_text.append(item.get("token", ""))
                    yield {
                        "event": "token",
                        "data": json.dumps({"token": item.get("token")})
                    }
                elif item_type == "done":
                    full_answer = "".join(assistant_full_text)
                    # Persist Assistant Message to DB
                    save_db = SessionLocal()
                    try:
                        asst_msg = Message(
                            id=str(uuid.uuid4()),
                            conversation_id=conv_id,
                            role="assistant",
                            content=full_answer,
                            sources=json.dumps(captured_sources) if captured_sources else None
                        )
                        save_db.add(asst_msg)
                        save_db.commit()
                        msg_id = asst_msg.id
                    finally:
                        save_db.close()

                    yield {
                        "event": "done",
                        "data": json.dumps({
                            "message_id": msg_id,
                            "conversation_id": conv_id,
                            "full_text": full_answer
                        })
                    }
        except Exception as e:
            logger.error(f"Error in chat event stream: {e}", exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"error": f"An error occurred while generating response: {str(e)}"})
            }

    return EventSourceResponse(event_generator())
