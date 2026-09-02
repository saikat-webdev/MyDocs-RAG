import React, { useEffect, useState } from "react";
import { Settings, RefreshCw, Cpu, Database, HardDrive, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../services/api";
import { SystemHealth } from "../types";

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await api.getHealth();
      setHealth(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            <span>System Health & Status</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status of local services, vector database, and inference engine.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Backend & SQLite */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Metadata Database</h3>
                <p className="text-xs text-slate-400">SQLite (mydocs.db)</p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {health?.database || "Available"}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Stores document metadata, SHA-256 hashes, conversations, and message history with cascading deletes.
          </p>
        </div>

        {/* ChromaDB */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Vector Database</h3>
                <p className="text-xs text-slate-400">ChromaDB PersistentClient</p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {health?.chromadb || "Available"}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Persistent local storage for vector embeddings with strict metadata filtering per document.
          </p>
        </div>

        {/* Embedding Model */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Embeddings Model</h3>
                <p className="text-xs text-slate-400">sentence-transformers</p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {health?.embedding_model?.status || "Loaded"}
            </span>
          </div>
          <div className="text-xs font-mono text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800 truncate">
            {health?.embedding_model?.name || "sentence-transformers/all-MiniLM-L6-v2"}
          </div>
        </div>

        {/* Ollama & Qwen */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Local LLM Inference</h3>
                <p className="text-xs text-slate-400">Ollama API (localhost:11434)</p>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                health?.ollama?.available
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {health?.ollama?.available ? "Online" : "Offline"}
            </span>
          </div>
          <div className="text-xs font-mono text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800 truncate">
            Target Model: {health?.ollama?.model || "qwen2.5:3b"}
          </div>
        </div>
      </div>

      {/* RAG Pipeline Configuration Table */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white">Active RAG Pipeline Configuration</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">Chunk Size</span>
            <span className="font-semibold text-slate-200">800 characters</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">Chunk Overlap</span>
            <span className="font-semibold text-slate-200">120 characters</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">Top-K Retrieval</span>
            <span className="font-semibold text-slate-200">5 chunks</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block">Similarity Threshold</span>
            <span className="font-semibold text-slate-200">0.25 (Cosine)</span>
          </div>
        </div>
      </div>
    </div>
  );
};