import React, { useEffect, useState } from "react";
import { Database, Plus, RefreshCw, AlertCircle, FileText, Search } from "lucide-react";
import { Document } from "../types";
import { api } from "../services/api";
import { DocumentCard } from "../components/DocumentCard";
import { UploadZone } from "../components/UploadZone";

interface DocumentLibraryPageProps {
  onOpenChat: (doc: Document) => void;
}

export const DocumentLibraryPage: React.FC<DocumentLibraryPageProps> = ({ onOpenChat }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError("Failed to load documents from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Are you sure you want to delete "${doc.original_filename}" and all associated vectors and chats?`)) {
      return;
    }
    try {
      await api.deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      alert("Failed to delete document.");
    }
  };

  const handleReprocess = async (doc: Document) => {
    try {
      await api.reprocessDocument(doc.id);
      // Temporarily mark processing in local state
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: "PROCESSING" } : d))
      );
      // Poll
      const poll = setInterval(async () => {
        const updated = await api.getDocument(doc.id);
        if (updated.status !== "PROCESSING") {
          clearInterval(poll);
          setDocuments((prev) =>
            prev.map((d) => (d.id === doc.id ? updated : d))
          );
        }
      }, 1500);
    } catch (err) {
      alert("Reprocessing failed to start.");
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Database className="w-6 h-6 text-emerald-400" />
            <span>My Documents</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your indexed document library and isolated RAG vector embeddings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDocuments}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4 font-bold" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search documents by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Document Grid */}
      {error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="py-20 text-center text-slate-500 text-xs">
          Loading document library...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-8 space-y-4">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-300">No documents found</h3>
            <p className="text-xs text-slate-500">
              {searchQuery ? "No documents match your search query." : "Upload your first PDF, DOCX, TXT or MD file to start chatting."}
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-semibold"
          >
            Upload Document Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onOpenChat={onOpenChat}
              onReprocess={handleReprocess}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Upload New Document</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>
            <UploadZone
              onDocumentReady={(doc) => {
                setShowUploadModal(false);
                onOpenChat(doc);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};