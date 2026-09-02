export type DocumentStatus = "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  file_hash: string;
  status: DocumentStatus;
  total_pages: number;
  total_chunks: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceChunk {
  document_id: string;
  chunk_id: string;
  chunk_index: number;
  filename: string;
  page_number?: number | null;
  file_type?: string | null;
  text: string;
  similarity_score: number;
}

export interface DebugInfo {
  question: string;
  retrieved_chunks: SourceChunk[];
  similarity_threshold: number;
  top_k: number;
  context_used: string;
  system_prompt: string;
  model: string;
  ollama_url: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: SourceChunk[] | null;
  created_at: string;
  debug_info?: DebugInfo | null;
}

export interface Conversation {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  app_name: string;
  database: string;
  chromadb: string;
  embedding_model: {
    name: string;
    status: string;
  };
  ollama: {
    available: boolean;
    model: string;
    model_present?: boolean;
    error?: string;
    installed_models?: string[];
  };
}