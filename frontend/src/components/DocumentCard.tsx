import React from "react";
import { FileText, MessageSquare, Trash2, RefreshCw, Layers, Calendar, HardDrive } from "lucide-react";
import { Document } from "../types";

interface DocumentCardProps {
  document: Document;
  onOpenChat: (doc: Document) => void;
  onReprocess: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onOpenChat,
  onReprocess,
  onDelete,
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getStatusBadge = () => {
    switch (document.status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Ready
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            Processing
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Uploaded
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all group">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold uppercase text-xs">
              {document.file_type}
            </div>
            <div className="max-w-[180px] sm:max-w-[220px]">
              <h3 className="text-sm font-semibold text-white truncate" title={document.original_filename}>
                {document.original_filename}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
                <span>{formatBytes(document.file_size)}</span>
                <span>•</span>
                <span>{document.total_pages} {document.total_pages === 1 ? "page" : "pages"}</span>
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {document.error_message && (
          <div className="mt-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs truncate">
            {document.error_message}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>{document.total_chunks} Chunks</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">
              {new Date(document.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <button
          onClick={() => onOpenChat(document)}
          disabled={document.status !== "COMPLETED"}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
            document.status === "COMPLETED"
              ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onReprocess(document)}
            title="Reprocess document"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(document)}
            title="Delete document & vectors"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};