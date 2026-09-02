from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Document, DocumentStatus
from app.schemas.document import DocumentResponse, DocumentDuplicateResponse
from app.services.document_service import document_service

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a document, calculate hash, check duplicates, and initiate indexing."""
    doc, is_duplicate = document_service.upload_document(file, db)
    
    if is_duplicate:
        return {
            "duplicate": True,
            "message": "This document already exists.",
            "document": DocumentResponse.model_validate(doc)
        }

    # Execute processing in background or immediately
    background_tasks.add_task(document_service.process_document, doc.id, db)
    
    return {
        "duplicate": False,
        "message": "Document uploaded successfully and indexing initiated.",
        "document": DocumentResponse.model_validate(doc)
    }

@router.get("", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    """Retrieve all uploaded documents ordered by creation time descending."""
    return db.query(Document).order_by(Document.created_at.desc()).all()

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    """Get metadata and status of a single document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc

@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    """Delete document, physical file, ChromaDB vectors, and associated conversations."""
    success = document_service.delete_document(document_id, db)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return {"success": True, "message": f"Document {document_id} and associated vectors deleted."}

@router.post("/{document_id}/reprocess")
def reprocess_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Reprocess document: purges old vectors and triggers text extraction & embedding anew."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    background_tasks.add_task(document_service.reprocess_document, document_id, db)
    return {"message": "Document reprocessing started.", "document_id": document_id}
