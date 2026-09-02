import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Bot, User, Bug } from "lucide-react";
import { Message, DebugInfo } from "../types";
import { SourceInspector } from "./SourceInspector";

interface ChatMessageProps {
  message: Message;
  onOpenDebug?: (debugInfo: DebugInfo) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onOpenDebug }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`py-5 px-4 sm:px-6 flex space-x-4 ${
        isUser ? "bg-transparent" : "bg-slate-900/40 border-y border-slate-800/40"
      }`}
    >
      <div className="shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
            <Bot className="w-4 h-4 font-bold" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">
            {isUser ? "You" : "MyDocs Assistant"}
          </span>

          {!isUser && message.content && (
            <div className="flex items-center space-x-2">
              {message.debug_info && onOpenDebug && (
                <button
                  onClick={() => onOpenDebug(message.debug_info!)}
                  title="Inspect RAG retrieval & prompt"
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 text-[11px] font-medium flex items-center space-x-1 transition"
                >
                  <Bug className="w-3 h-3" />
                  <span>Debug</span>
                </button>
              )}
              <button
                onClick={handleCopy}
                title="Copy response"
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed font-normal">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={atomDark}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-xl my-2 text-xs border border-slate-800"
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 text-xs" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceInspector sources={message.sources} />
        )}
      </div>
    </div>
  );
};