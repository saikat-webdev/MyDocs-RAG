# 📄 MyDocs — Local AI Document Chat Application

<div align="center">

> *"Your private AI for your documents."*

[![Local-First](https://img.shields.io/badge/Privacy-100%25%20Local-emerald?style=for-the-badge&logo=shield)](https://github.com/saikat-webdev/MyDocs-RAG)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20+%20TS-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![ChromaDB](https://img.shields.io/badge/Vector%20DB-ChromaDB-blue?style=for-the-badge)](https://www.trychroma.com)
[![Ollama](https://img.shields.io/badge/LLM-Ollama%20(Qwen2.5%203B)-orange?style=for-the-badge&logo=ollama)](https://ollama.com)
[![Tailwind CSS](https://img.shields.io/badge/Style-Tailwind%20v4-38B2AC?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)

</div>

---

## 📌 1. Project Overview

**MyDocs** is a full-stack, local-first artificial intelligence application that allows users to upload any document (**PDF, DOCX, TXT, Markdown**) and have an interactive, transparent conversation specifically about that document.

Built around a real Retrieval-Augmented Generation (RAG) architecture, **all operations run entirely on your local machine**:
- **Zero Cloud AI APIs**: No OpenAI, Gemini, Claude, Groq, or OpenRouter.
- **Data Privacy**: No document text, queries, vectors, or metadata leave your local device.
- **Authentic RAG**: Documents are parsed, split into contextual chunks, embedded into dense vector space, indexed in ChromaDB, and retrieved deterministically for each user query.

---

## 🏗️ 2. Architecture & RAG Pipeline

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

## 🚀 3. Key Capabilities

### 🔒 Strict Document Isolation
Every uploaded document is assigned a unique UUID. Chunks stored in ChromaDB are tagged with metadata `{"document_id": doc_id}`. When chatting with a document, the retrieval engine queries ChromaDB with a strict metadata filter (`where={"document_id": doc_id}`), making it mathematically impossible to retrieve or mix chunks from other documents.

### ⚡ Real-Time SSE Token Streaming
Answers are streamed token-by-token from local Ollama to the React frontend using Server-Sent Events (SSE). Users experience instantaneous feedback with live typing effects and the ability to stop generation mid-stream.

### 🔍 Source Citations & Transparency
Every response displays exact source attribution (filename, page number, match percentage) alongside an expandable "View context" inspector to view the exact text chunks retrieved from your document.

### 🛡️ Anti-Hallucination Prompting
The assistant uses a strict system prompt instructing Qwen2.5 3B to answer **only** using provided document context. If asked something not in the document (e.g., *"What is the CEO's favorite food?"*), it explicitly responds:
> *"I couldn't find this information in the document."*

### 🛠️ Developer RAG Debug Mode
Toggle the built-in Debug Inspector to view similarity scores, cosine distances, raw retrieved chunks, assembled prompt payloads, and model parameters.

### ♻️ Cascading Deletion & Deduplication
- **SHA-256 Deduplication**: Uploading an identical document detects the existing record and allows opening it immediately without redundant indexing.
- **Cascading Deletes**: Deleting a document removes its SQLite metadata, conversation logs, disk storage file, and all associated ChromaDB vector embeddings.

---

## 💻 4. Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4 | High-performance SPA with markdown and syntax highlighting |
| **Backend** | Python 3.10+, FastAPI, Uvicorn | High-throughput asynchronous REST API |
| **Database** | SQLite + SQLAlchemy | Application metadata, document registry, conversations, messages |
| **Vector DB** | ChromaDB | Local persistent vector storage with cosine distance indexing |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` | Dense 384-dimensional vector embedding model loaded once at startup |
| **LLM Inference** | Ollama (`qwen2.5:3b`) | Lightweight local language model running on localhost:11434 |
| **Document Parsers** | `pypdf`, `python-docx`, text/markdown | Multi-format text and page-number extractors |
| **Text Splitter** | `langchain-text-splitters` | Recursive character text chunking with overlap |

---

## 📂 5. Project Directory Structure

```
MyDocs/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers (documents, chat, health, conversations)
│   │   ├── core/            # Configuration (.env loader), structured logging
│   │   ├── db/              # SQLAlchemy SQLite session & models
│   │   ├── schemas/         # Pydantic request/response validation schemas
│   │   ├── services/        # Parsers, chunker, embeddings, vector store, retriever, Ollama, RAG
│   │   ├── prompts/         # Strict RAG system prompt & prompt builder
│   │   ├── utils/           # File validation, hash calculations, sanitization
│   │   └── main.py          # FastAPI application entrypoint & lifespan
│   ├── data/
│   │   ├── uploads/         # Uploaded documents (PDF, DOCX, TXT, MD)
│   │   ├── chroma/          # Persistent ChromaDB vector storage
│   │   └── database/        # SQLite database (mydocs.db)
│   ├── tests/               # Unit, integration & live RAG evaluation suite
│   ├── requirements.txt     # Python backend dependencies
│   ├── pytest.ini           # Pytest configuration
│   ├── .env.example         # Environment variables template
│   └── .env                 # Active local configuration
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (UploadZone, DocumentCard, SourceInspector, DebugDrawer, ChatMessage, Navbar)
│   │   ├── pages/           # HomePage, DocumentLibraryPage, ChatPage, SettingsPage
│   │   ├── services/        # Axios API client & SSE stream handlers
│   │   ├── types/           # TypeScript interfaces
│   │   ├── App.tsx          # Main React Application
│   │   ├── main.tsx         # Entrypoint
│   │   └── index.css        # Tailwind CSS styling
│   ├── package.json         # NPM dependencies
│   ├── vite.config.ts       # Vite bundler configuration
│   └── tsconfig.json        # TypeScript configuration
├── docs/
│   └── architecture.md      # In-depth architectural documentation
├── README.md                # Project documentation
└── .gitignore               # Git exclusions
```

---

## ⚙️ 6. Prerequisites & Installation

### 1. Prerequisites
- **Python 3.10+** (Tested on Python 3.13)
- **Node.js 18+** & npm
- **Ollama** installed ([https://ollama.com](https://ollama.com))

### 2. Pull Ollama Model
In your terminal, verify and download `qwen2.5:3b`:
```bash
ollama list
ollama pull qwen2.5:3b
```

---

## 🏃 7. Running the Application

### Backend Setup (PowerShell / Terminal)

```powershell
# Navigate to backend
cd MyDocs/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux / macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### Frontend Setup (New Terminal)

```powershell
# Navigate to frontend
cd MyDocs/frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
- Open your browser at: `http://localhost:5173`

---

## 🔧 8. Configuration & Environment Variables

Create and edit `backend/.env` (configured via `backend/app/core/config.py`):

| Variable | Default Value | Description |
|---|---|---|
| `APP_NAME` | `MyDocs` | Application name displayed in UI and headers |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama local HTTP API endpoint |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Target local model (e.g. `qwen2.5:3b`, `qwen2.5:1.5b`) |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model loaded once at startup |
| `CHROMA_PERSIST_DIRECTORY` | `./data/chroma` | Persistent local directory for ChromaDB vectors |
| `DATABASE_URL` | `sqlite:///./data/database/mydocs.db` | SQLite database URI |
| `CHUNK_SIZE` | `800` | Target character size per text chunk |
| `CHUNK_OVERLAP` | `120` | Character overlap between adjacent chunks |
| `TOP_K` | `5` | Maximum relevant chunks retrieved per question |
| `SIMILARITY_THRESHOLD` | `0.25` | Minimum cosine similarity threshold for retrieval |
| `MAX_CHAT_HISTORY` | `10` | Maximum recent conversation messages sent as context |
| `MAX_UPLOAD_SIZE_MB` | `25` | Maximum upload size per file in megabytes |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed frontend origins |
| `LOG_LEVEL` | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |

---

## 🧪 9. Testing & Evaluation

### 1. Automated Pytest Suite
Run the 9 backend unit & integration tests covering parsers, chunker, embeddings, vector store, document isolation, and REST APIs:
```powershell
cd MyDocs/backend
.\venv\Scripts\python -m pytest tests/ -v
```

### 2. Live RAG Evaluation Runner
Executes live evaluation cases from `backend/tests/rag_test_cases.json` against local Ollama (`qwen2.5:3b`):
```powershell
cd MyDocs/backend
.\venv\Scripts\python tests/evaluate_rag.py
```

---

## ❓ 10. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `Ollama is not running` | Ollama service is stopped | Run `ollama serve` or start Ollama from the Windows taskbar. |
| `Model not found` | `qwen2.5:3b` not pulled | Run `ollama pull qwen2.5:3b`. |
| `CORS Error in Browser` | Frontend port mismatch | Ensure frontend URL is in `CORS_ORIGINS` in `backend/.env`. |
| `Memory / CPU high` | 3B model load on low-RAM machine | Switch `OLLAMA_MODEL=qwen2.5:1.5b` or `qwen2.5:0.5b` in `backend/.env`. |

---

## 📜 11. License

Licensed under the [MIT License](LICENSE).