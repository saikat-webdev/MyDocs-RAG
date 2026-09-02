import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException, status

from app.core.config import settings
from app.core.logging import logger
from app.db.models import Document, DocumentStatus
from app.schemas.document import DocumentResponse
from app.utils.file_utils import sanitize_filename, calculate_sha256, validate_file
from app.services.parser_service import ParserService, DocumentParseError
from app.services.chunking_service import chunking_service
from app.services.embedding_service import get_embedding_service
from app.services.vector_service import get_vector_service

class DocumentService:
    @staticmethod
    def upload_document(file: UploadFile, db: Session) -> Tuple[Document, bool]:
        """
        Validates file, writes to temp location, checks hash for duplicates.
        Returns (Document, is_duplicate).
        """
        clean_name, ext = validate_file(file)
        
        # Ensure uploads directory
        uploads_dir = Path(settings.UPLOAD_DIR)
        uploads_dir.mkdir(parents=True, exist_ok=True)

        # Temporary file for hash calculation and size verification
        temp_id = str(uuid.uuid4())
        temp_path = uploads_dir / f"temp_{temp_id}_{clean_name}"

        try:
            total_size = 0
            with open(temp_path, "wb") as buffer:
                while chunk := file.file.read(65536):
                    total_size += len(chunk)
                    if total_size > settings.max_upload_size_bytes:
                        temp_path.unlink(missing_ok=True)
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB"
                        )
                    buffer.write(chunk)

            file_hash = calculate_sha256(temp_path)

            # Check if file with identical SHA-256 already exists in DB
            existing_doc = db.query(Document).filter(Document.file_hash == file_hash).first()
            if existing_doc:
                temp_path.unlink(missing_ok=True)
                logger.info(f"Duplicate document detected: {clean_name} (Matches doc {existing_doc.id})")
                return existing_doc, True

            # Create new document record
            doc_id = str(uuid.uuid4())
            final_filename = f"{doc_id}_{clean_name}"
            final_path = uploads_dir / final_filename

            # Move temp to final filename
            shutil.move(str(temp_path), str(final_path))

            doc = Document(
                id=doc_id,
                filename=final_filename,
                original_filename=clean_name,
                file_type=ext.lstrip("."),
                file_size=total_size,
                file_hash=file_hash,
                status=DocumentStatus.UPLOADED,
                total_pages=0,
                total_chunks=0
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            logger.info(f"Created document record: {doc.id} ({doc.original_filename})")
            return doc, False

        except Exception as e:
            temp_path.unlink(missing_ok=True)
            if isinstance(e, HTTPException):
                raise
            logger.error(f"Failed to handle document upload: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"File upload processing failed: {str(e)}"
            )

    @staticmethod
    def process_document(document_id: str, db: Session) -> Document:
        """
        Executes full ingestion pipeline synchronously or in background task:
        1. Extract text page-by-page
        2. Chunk text
        3. Compute embeddings
        4. Insert into ChromaDB
        5. Mark COMPLETED or FAILED
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise ValueError(f"Document {document_id} not found")

        doc.status = DocumentStatus.PROCESSING
        doc.error_message = None
        db.commit()

        file_path = Path(settings.UPLOAD_DIR) / doc.filename
        if not file_path.exists():
            doc.status = DocumentStatus.FAILED
            doc.error_message = "Original file is missing from disk storage."
            db.commit()
            return doc

        try:
            logger.info(f"Starting processing for document {doc.id} ({doc.original_filename})")
            
            # Step 1: Parse
            pages_data, total_pages = ParserService.parse_document(file_path, doc.file_type)
            doc.total_pages = total_pages

            # Step 2: Chunk
            chunks = chunking_service.create_chunks(
                document_id=doc.id,
                filename=doc.original_filename,
                file_type=doc.file_type,
                pages_data=pages_data
            )
            if not chunks:
                raise DocumentParseError("No meaningful chunks could be generated from document text.")

            doc.total_chunks = len(chunks)

            # Step 3: Embed
            embedding_svc = get_embedding_service()
            chunk_texts = [c["text"] for c in chunks]
            embeddings = embedding_svc.embed_documents(chunk_texts)

            # Step 4: Index into ChromaDB
            vector_svc = get_vector_service()
            vector_svc.insert_chunks(doc.id, chunks, embeddings)

            doc.status = DocumentStatus.COMPLETED
            doc.error_message = None
            db.commit()
            db.refresh(doc)
            logger.info(f"Successfully processed and indexed document {doc.id}")
            return doc

        except Exception as e:
            logger.error(f"Error processing document {doc.id}: {e}", exc_info=True)
            doc.status = DocumentStatus.FAILED
            doc.error_message = str(e)
            db.commit()
            db.refresh(doc)
            return doc

    @staticmethod
    def reprocess_document(document_id: str, db: Session) -> Document:
        """Reprocess an existing document: purge old vectors and re-index."""
        vector_svc = get_vector_service()
        vector_svc.delete_document_vectors(document_id)
        return DocumentService.process_document(document_id, db)

    @staticmethod
    def delete_document(document_id: str, db: Session) -> bool:
        """
        Cascading delete:
        1. ChromaDB vectors
        2. Uploaded file on disk
        3. SQLite Document row (cascades conversations and messages)
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return False

        # 1. Delete vectors
        vector_svc = get_vector_service()
        vector_svc.delete_document_vectors(document_id)

        # 2. Delete file
        file_path = Path(settings.UPLOAD_DIR) / doc.filename
        if file_path.exists():
            try:
                file_path.unlink(missing_ok=True)
            except Exception as e:
                logger.warning(f"Could not delete physical file {file_path}: {e}")

        # 3. Delete from DB
        db.delete(doc)
        db.commit()
        logger.info(f"Deleted document {document_id} and all related data.")
        return True

document_service = DocumentService()
