from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.db.models import DocumentStatus

class DocumentBase(BaseModel):
    original_filename: str
    file_type: str
    file_size: int

class DocumentCreate(DocumentBase):
    filename: str
    file_hash: str

class DocumentResponse(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    file_hash: str
    status: DocumentStatus
    total_pages: int
    total_chunks: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class DocumentStatusUpdate(BaseModel):
    status: DocumentStatus
    total_pages: Optional[int] = None
    total_chunks: Optional[int] = None
    error_message: Optional[str] = None

class DocumentDuplicateResponse(BaseModel):
    message: str = "This document already exists."
    document: DocumentResponse