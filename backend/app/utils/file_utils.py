import hashlib
import os
import re
from pathlib import Path
from typing import Tuple
from fastapi import HTTPException, UploadFile, status
from app.core.config import settings
from app.core.logging import logger

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and invalid filesystem characters."""
    # Remove path components
    basename = os.path.basename(filename)
    # Remove characters that are not alphanumeric, dots, underscores, dashes, or spaces
    cleaned = re.sub(r'[^a-zA-Z0-9._\- ]', '_', basename)
    # Collapse consecutive dots or underscores
    cleaned = re.sub(r'\.{2,}', '.', cleaned)
    cleaned = re.sub(r'_{2,}', '_', cleaned)
    return cleaned.strip() or "document"

def calculate_sha256(file_path: Path) -> str:
    """Calculate SHA-256 hash of a file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def validate_file(file: UploadFile) -> Tuple[str, str]:
    """Validate file extension and return (extension, content_type)."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty"
        )
    
    clean_name = sanitize_filename(file.filename)
    ext = Path(clean_name).suffix.lower()
    
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    return clean_name, ext
