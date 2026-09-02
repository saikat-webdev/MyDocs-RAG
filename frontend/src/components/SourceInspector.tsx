import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Eye, Sparkles } from "lucide-react";
import { SourceChunk } from "../types";

interface SourceInspectorProps {
  sources: SourceChunk[];
}

export const SourceInspector: React.FC<SourceInspectorProps> = ({ sources }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-800/80">
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span>Retrieved Sources ({sources.length})</span>
      </div>

      <div className="space-y-1.5">
        {sources.map((source, idx) => {
          const isExpanded = expandedIndex === idx;
          const scorePercent = Math.round((source.similarity_score || 0) * 100);

          return (
            <div
              key={source.chunk_id || idx}
              className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs transition"
            >
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-800/50"
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-200 truncate">
                    {source.filename}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                    {source.page_number ? `Page ${source.page_number}` : "Section"}
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      scorePercent >= 60
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {scorePercent}% match
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 py-2.5 bg-slate-950/80 border-t border-slate-800/80 text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {source.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};