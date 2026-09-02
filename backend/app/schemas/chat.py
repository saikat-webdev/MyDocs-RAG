from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class SourceChunk(BaseModel):
    document_id: str
    chunk_id: str
    chunk_index: int
    filename: str
    page_number: Optional[int] = None
    file_type: Optional[str] = None
    text: str
    similarity_score: float

class ChatRequest(BaseModel):
    document_id: str
    conversation_id: Optional[str] = None
    question: str = Field(..., min_length=1, max_length=4000)
    debug_mode: bool = False

class DebugInfo(BaseModel):
    question: str
    retrieved_chunks: List[SourceChunk]
    similarity_threshold: float
    top_k: int
    context_used: str
    system_prompt: str
    model: str
    ollama_url: str

class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    role: str = "assistant"
    content: str
    sources: List[SourceChunk] = []
    debug_info: Optional[DebugInfo] = None

class ConversationCreate(BaseModel):
    document_id: str
    title: Optional[str] = "New Conversation"

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    sources: Optional[List[SourceChunk]] = None
    created_at: datetime

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []