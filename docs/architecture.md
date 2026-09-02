# MyDocs — Architecture & Deep Dive

"Your private AI for your documents."

MyDocs is an end-to-end, 100% local document question-answering application built with a modern Retrieval-Augmented Generation (RAG) architecture. No document content, queries, or embeddings ever leave the host machine.

---

## 1. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  USER / BROWSER                                   |
|                               (React + TypeScript + Tailwind)                     |
+-----------------------------------------------------------------------------------+
             | Upload Document (PDF/DOCX/TXT/MD)             | Chat Question (SSE)
             v                                               v
+-----------------------------------------------------------------------------------+
|                                 FASTAPI BACKEND                                   |
|                                                                                   |
|  +---------------------+   +---------------------+   +-------------------------+  |
|  |   Ingestion & Hash  |   |  Text Parser Engine |   |   Recursive Chunker     |  |
|  |   (SHA-256 Check)   |-->|  (PyPDF/DOCX/TXT/MD)|-->| (800 chars / 120 ovlp) |  |
|  +---------------------+   +---------------------+   +-------------------------+  |
|                                                                    |              |
|                                                                    v              |
|  +---------------------+                             +-------------------------+  |
|  |  SQLite Database    |<----------------------------|   Embedding Service     |  |
|  | (Metadata & History)|                             | (all-MiniLM-L6-v2)      |  |
|  +---------------------+                             +-------------------------+  |
|             ^                                                      |              |
|             | Cascading                                            v              |
|             | Cleanup                                +-------------------------+  |
|             |                                        |  ChromaDB Vector Store  |  |
|             +----------------------------------------|  (Persistent Local)     |  |
|                                                      +-------------------------+  |
|                                                                    |              |
|                                          Filtered Cosine Retrieval | (document_id)|
|                                                                    v              |
|  +---------------------+                             +-------------------------+  |
|  |  Streaming SSE Hub  |<----------------------------|   RAG Orchestrator      |  |
|  +---------------------+                             +-------------------------+  |
+-------------------------------------------------------------------|---------------+
                                                                    | Local HTTP
                                                                    v (localhost:11434)
                                                       +-------------------------+
                                                       |      OLLAMA DAEMON      |
                                                       |      (qwen2.5:3b)       |
                                                       +-------------------------+
```

---

## 2. Ingestion Pipeline

1. **Upload & Validation**:
   - Filenames are sanitized against path traversal (`../`, illegal characters).
   - Supported extensions: `.pdf`, `.docx`, `.txt`, `.md`.
   - Size limit checked (configurable via `MAX_UPLOAD_SIZE_MB`).
2. **SHA-256 Deduplication**:
   - A SHA-256 checksum is calculated for every incoming file.
   - If a file with the identical hash already exists in SQLite, ingestion is skipped, and the user is provided the option to open the existing document.
3. **Text Extraction**:
   - **PDF**: Extracted page-by-page using `pypdf.PdfReader` to preserve exact 1-indexed page numbers.
   - **DOCX**: Extracted paragraph-by-paragraph and table rows using `python-docx`.
   - **TXT / Markdown**: Decoded with fallback encodings (`utf-8`, `utf-8-sig`, `latin-1`).
4. **Recursive Chunking**:
   - Utilizes `RecursiveCharacterTextSplitter` with separators `["\n\n", "\n", ". ", " ", ""]`.
   - Standard chunk size: 800 characters with 120 characters overlap.
   - Metadata is tagged onto each chunk: `document_id`, `chunk_id` (`{document_id}_{chunk_index}`), `chunk_index`, `filename`, `page_number`, and `file_type`.
5. **Embedding Generation**:
   - Single-instance pre-warmed `SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")`.
   - Computes normalized 384-dimensional dense vectors.
6. **Vector Indexing**:
   - Inserted into persistent ChromaDB collection `mydocs_documents` configured with cosine space (`hnsw:space: cosine`).

---

## 3. Strict Document Isolation

Isolation is a fundamental security and precision guarantee in MyDocs:
- **Vector Partitioning**: Every vector inserted into ChromaDB includes `metadata={"document_id": doc_id}`.
- **Scoring & Retrieval**: When answering questions for Document A (`abc123`), the ChromaDB query specifies `where={"document_id": "abc123"}`. Chunks from any other document are physically impossible to retrieve.
- **Conversation Isolation**: Every conversation belongs to a single document ID in SQLite. The `/api/chat` endpoint verifies that the requested `conversation_id` matches the `document_id`.

---

## 4. RAG Retrieval & Prompt Assembly

1. **Query Embedding**: The user query is embedded into a 384-dimensional vector using the shared `all-MiniLM-L6-v2` model.
2. **Similarity Scoring**:
   - ChromaDB returns cosine distance $d \in [0, 2]$.
   - Similarity score is computed as $\text{similarity} = 1.0 - d$.
   - Chunks below `SIMILARITY_THRESHOLD` (default `0.25`) are discarded.
3. **Context Construction**:
   - High-ranking chunks are formatted with explicit headers:
     ```
     --- [Source Chunk 1 | annual_report.pdf | Page 12] ---
     <chunk text>
     ```
4. **Anti-Hallucination Prompting**:
   - The strict system prompt instructs Qwen2.5 3B to answer **only** using provided document context and state `"I couldn't find this information in the document."` if missing.
5. **Streaming Generation**:
   - Tokens stream directly from Ollama to the browser using Server-Sent Events (SSE).

---

## 5. Storage & Cascading Deletion

When a document is deleted:
1. ChromaDB vector embeddings for `document_id` are purged.
2. The original file in `backend/data/uploads/` is deleted.
3. The SQLite database row is removed, which cascades and removes all conversation records and chat history.