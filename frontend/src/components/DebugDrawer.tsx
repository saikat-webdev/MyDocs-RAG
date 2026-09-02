import React from "react";
import { X, Bug, Terminal, Cpu, Database, Layers } from "lucide-react";
import { DebugInfo } from "../types";

interface DebugDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debugInfo: DebugInfo | null;
}

export const DebugDrawer: React.FC<DebugDrawerProps> = ({ isOpen, onClose, debugInfo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Bug className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">RAG Debug Inspector</h2>
            <p className="text-[11px] text-slate-400">Inspection of pipeline query & context assembly</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
        {!debugInfo ? (
          <div className="text-center py-12 text-slate-500">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No active debug information recorded for this turn.</p>
            <p className="text-[11px] text-slate-600 mt-1">Ask a question with Debug Mode enabled to inspect.</p>
          </div>
        ) : (
          <>
            {/* Meta badges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400 flex items-center space-x-1.5 mb-1">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Model</span>
                </div>
                <div className="font-semibold text-white truncate">{debugInfo.model}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400 flex items-center space-x-1.5 mb-1">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>Threshold / Top-K</span>
                </div>
                <div className="font-semibold text-white">
                  {debugInfo.similarity_threshold} / Top {debugInfo.top_k}
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="space-y-1.5">
              <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">User Query</h3>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-200">
                {debugInfo.question}
              </div>
            </div>

            {/* Retrieved Chunks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                  Retrieved Chunks ({debugInfo.retrieved_chunks.length})
                </h3>
              </div>

              {debugInfo.retrieved_chunks.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 italic">
                  No chunks met the similarity threshold ({debugInfo.similarity_threshold}).
                </div>
              ) : (
                <div className="space-y-2">
                  {debugInfo.retrieved_chunks.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-emerald-400">
                          Chunk #{c.chunk_index} ({c.chunk_id})
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                          Score: {c.similarity_score}
                        </span>
                      </div>
                      <p className="font-mono text-slate-300 whitespace-pre-wrap leading-relaxed text-[11px]">
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assembled Context */}
            <div className="space-y-1.5">
              <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                Constructed Context Payload
              </h3>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {debugInfo.context_used}
              </pre>
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                System Instructions
              </h3>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-400 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto text-[11px]">
                {debugInfo.system_prompt}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
};