from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.core.config import settings
from app.services.ollama_service import ollama_service
from app.services.embedding_service import get_embedding_service
from app.services.vector_service import get_vector_service

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
async def general_health(db: Session = Depends(get_db)):
    """Check overall system health (Database, ChromaDB, Embeddings, Ollama)."""
    # Check SQLite
    db_status = "Available"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"Error: {str(e)}"

    # Check ChromaDB
    chroma_status = "Available"
    try:
        vec_svc = get_vector_service()
        _ = vec_svc.collection.count()
    except Exception as e:
        chroma_status = f"Error: {str(e)}"

    # Check Embedding Model
    emb_status = "Loaded"
    try:
        _ = get_embedding_service()
    except Exception as e:
        emb_status = f"Error: {str(e)}"

    # Check Ollama
    ollama_health = await ollama_service.check_health()

    return {
        "status": "healthy" if db_status == "Available" and chroma_status == "Available" else "degraded",
        "app_name": settings.APP_NAME,
        "database": db_status,
        "chromadb": chroma_status,
        "embedding_model": {
            "name": settings.EMBEDDING_MODEL,
            "status": emb_status
        },
        "ollama": ollama_health
    }

@router.get("/ollama")
async def ollama_health():
    """Specific health check endpoint for local Ollama service."""
    return await ollama_service.check_health()
