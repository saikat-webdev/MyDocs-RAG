from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.core.logging import logger

class ChunkingService:
    def __init__(self, chunk_size: int = None, chunk_overlap: int = None):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def create_chunks(
        self,
        document_id: str,
        filename: str,
        file_type: str,
        pages_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Takes parsed pages_data: [{"page_number": int, "text": str}]
        Splits into chunks while preserving page numbers and attaching deterministic chunk IDs.
        """
        chunks: List[Dict[str, Any]] = []
        chunk_index = 0

        for page in pages_data:
            page_num = page.get("page_number", 1)
            page_text = page.get("text", "").strip()
            if not page_text:
                continue

            splits = self.splitter.split_text(page_text)
            for split_text in splits:
                text_clean = split_text.strip()
                if not text_clean:
                    continue
                
                chunk_id = f"{document_id}_{chunk_index}"
                chunks.append({
                    "chunk_id": chunk_id,
                    "chunk_index": chunk_index,
                    "document_id": document_id,
                    "filename": filename,
                    "file_type": file_type,
                    "page_number": page_num,
                    "text": text_clean
                })
                chunk_index += 1

        logger.info(f"Generated {len(chunks)} chunks for document {document_id} ({filename})")
        return chunks

chunking_service = ChunkingService()
