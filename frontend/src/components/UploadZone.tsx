import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { api } from "../services/api";
import { Document } from "../types";

interface UploadZoneProps {
  onDocumentReady: (doc: Document) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onDocumentReady }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateDoc, setDuplicateDoc] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = [".pdf", ".docx", ".txt", ".md"];
  const maxMb = 25;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const pollDocumentStatus = async (docId: string) => {
    const maxAttempts = 40;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const doc = await api.getDocument(docId);
        if (doc.status === "COMPLETED") {
          clearInterval(interval);
          setStatusMessage(`✓ Document ready (${doc.total_chunks} chunks indexed)`);
          setUploading(false);
          setTimeout(() => {
            onDocumentReady(doc);
          }, 800);
        } else if (doc.status === "FAILED") {
          clearInterval(interval);
          setUploading(false);
          setErrorMessage(doc.error_message || "Document processing failed. Please retry.");
        } else {
          setStatusMessage("Extracting text, chunking & generating embeddings...");
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setUploading(false);
          setErrorMessage("Processing timed out. Check backend status.");
        }
      }
    }, 1200);
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setDuplicateDoc(null);

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMessage(`Unsupported file format '${ext}'. Supported formats: PDF, DOCX, TXT, MD`);
      return;
    }

    if (file.size > maxMb * 1024 * 1024) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is ${maxMb}MB.`);
      return;
    }

    try {
      setUploading(true);
      setStatusMessage("Uploading document...");
      const res = await api.uploadDocument(file);

      if (res.duplicate) {
        setUploading(false);
        setDuplicateDoc(res.document);
        return;
      }

      setStatusMessage("Document uploaded. Processing RAG pipeline...");
      pollDocumentStatus(res.document.id);
    } catch (err: any) {
      setUploading(false);
      const detail = err.response?.data?.detail || "Upload failed. Please ensure the backend server is running.";
      setErrorMessage(detail);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer relative overflow-hidden ${
          isDragging
            ? "border-emerald-400 bg-emerald-950/20 scale-[1.01]"
            : "border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80"
        } ${uploading ? "pointer-events-none opacity-90" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={handleFileSelect}
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">{statusMessage}</p>
              <p className="text-xs text-slate-400">Embeddings & ChromaDB local vector indexing</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-xl group-hover:scale-110 transition">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-white">
                Drag and drop your document here, or{" "}
                <span className="text-emerald-400 underline underline-offset-4 font-bold">Browse Files</span>
              </p>
              <p className="text-xs text-slate-400">
                Supported: PDF, DOCX, TXT, Markdown (Max {maxMb}MB)
              </p>
            </div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
              <span>🔒 100% Local & Private Processing</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start space-x-3 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">Processing Failed</p>
            <p className="text-xs text-rose-300/90 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Duplicate Document Modal / Notice */}
      {duplicateDoc && (
        <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-center justify-between text-sm animate-fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-amber-100">This document already exists in MyDocs</p>
              <p className="text-xs text-amber-300/80">
                "{duplicateDoc.original_filename}" ({duplicateDoc.total_chunks} chunks ready)
              </p>
            </div>
          </div>
          <button
            onClick={() => onDocumentReady(duplicateDoc)}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 transition"
          >
            <span>Open Existing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};