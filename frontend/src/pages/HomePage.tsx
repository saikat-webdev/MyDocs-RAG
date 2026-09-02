import React, { useEffect, useState } from "react";
import { Shield, Cpu, Lock, Layers, ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { UploadZone } from "../components/UploadZone";
import { Document } from "../types";
import { api } from "../services/api";

interface HomePageProps {
  onDocumentSelected: (doc: Document) => void;
  onNavigateLibrary: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onDocumentSelected, onNavigateLibrary }) => {
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const docs = await api.listDocuments();
        setRecentDocs(docs.slice(0, 3));
      } catch (err) {
        console.error("Failed to load recent docs:", err);
      }
    };
    loadRecent();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>100% Local Inference • Zero Cloud Dependencies</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          MyDocs
        </h1>
        <p className="text-xl sm:text-2xl font-medium text-emerald-400">
          "Your private AI for your documents."
        </p>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Upload any document and have an intelligent, transparent conversation powered by real RAG,
          deterministic vector retrieval, and local Qwen2.5 3B inference.
        </p>
      </div>

      {/* Primary Action: Upload Document */}
      <div className="max-w-2xl mx-auto">
        <UploadZone onDocumentReady={onDocumentSelected} />
      </div>

      {/* Recent Documents Quick Access */}
      {recentDocs.length > 0 && (
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recently Uploaded
            </h2>
            <button
              onClick={onNavigateLibrary}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <span>View all ({recentDocs.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => doc.status === "COMPLETED" && onDocumentSelected(doc)}
                className={`p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center space-x-3 transition group ${
                  doc.status === "COMPLETED"
                    ? "hover:border-slate-700 hover:bg-slate-900 cursor-pointer"
                    : "opacity-60"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase shrink-0">
                  {doc.file_type}
                </div>
                <div className="truncate flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition">
                    {doc.original_filename}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {doc.total_chunks} chunks • {doc.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800/80">
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Strict Document Isolation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every conversation is scoped strictly to its parent document ID. Vectors and retrieval never cross-pollinate across files.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Full Local RAG Pipeline</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            PyPDF/DOCX extraction, recursive text chunking, all-MiniLM-L6-v2 embeddings, and persistent ChromaDB vector storage.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Streaming Qwen2.5 3B</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Token-by-token streaming via Ollama with full source citations, page attribution, and anti-hallucination verification.
          </p>
        </div>
      </div>
    </div>
  );
};