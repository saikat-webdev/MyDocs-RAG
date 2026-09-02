import axios from "axios";
import { Document, Conversation, Message, SystemHealth } from "../types";

const API_BASE = "http://localhost:8000/api";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const api = {
  // Health
  getHealth: async (): Promise<SystemHealth> => {
    const res = await client.get<SystemHealth>("/health");
    return res.data;
  },
  getOllamaHealth: async () => {
    const res = await client.get("/health/ollama");
    return res.data;
  },

  // Documents
  uploadDocument: async (file: File): Promise<{ duplicate: boolean; message: string; document: Document }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await client.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    return res.data;
  },

  listDocuments: async (): Promise<Document[]> => {
    const res = await client.get<Document[]>("/documents");
    return res.data;
  },

  getDocument: async (id: string): Promise<Document> => {
    const res = await client.get<Document>(`/documents/${id}`);
    return res.data;
  },

  deleteDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await client.delete(`/documents/${id}`);
    return res.data;
  },

  reprocessDocument: async (id: string): Promise<{ message: string; document_id: string }> => {
    const res = await client.post(`/documents/${id}/reprocess`);
    return res.data;
  },

  // Conversations
  listConversations: async (documentId?: string): Promise<Conversation[]> => {
    const res = await client.get<Conversation[]>("/conversations", {
      params: documentId ? { document_id: documentId } : undefined,
    });
    return res.data;
  },

  createConversation: async (documentId: string, title?: string): Promise<Conversation> => {
    const res = await client.post<Conversation>("/conversations", {
      document_id: documentId,
      title: title || "New Chat",
    });
    return res.data;
  },

  getConversation: async (conversationId: string): Promise<Conversation> => {
    const res = await client.get<Conversation>(`/conversations/${conversationId}`);
    return res.data;
  },

  deleteConversation: async (conversationId: string): Promise<{ success: boolean }> => {
    const res = await client.delete(`/conversations/${conversationId}`);
    return res.data;
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    const res = await client.get<Message[]>(`/conversations/${conversationId}/messages`);
    return res.data;
  },
};