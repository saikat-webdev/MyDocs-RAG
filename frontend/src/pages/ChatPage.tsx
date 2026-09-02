import React, { useEffect, useState, useRef } from "react";
import {
  FileText,
  Send,
  Square,
  RefreshCw,
  Trash2,
  Bug,
  Plus,
  ArrowLeft,
  Bot,
  Layers,
  Calendar,
  Sparkles,
  Info
} from "lucide-react";
import { Document, Conversation, Message, SourceChunk, DebugInfo } from "../types";
import { api } from "../services/api";
import { ChatMessage } from "../components/ChatMessage";
import { DebugDrawer } from "../components/DebugDrawer";

interface ChatPageProps {
  document: Document;
  onBack: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ document: doc, onBack }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [activeDebugInfo, setActiveDebugInfo] = useState<DebugInfo | null>(null);
  const [isDebugDrawerOpen, setIsDebugDrawerOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Load conversations for this document
  const loadConversations = async () => {
    try {
      const convs = await api.listConversations(doc.id);
      setConversations(convs);
      if (convs.length > 0 && !currentConvId) {
        setCurrentConvId(convs[0].id);
        loadMessages(convs[0].id);
      } else if (convs.length === 0) {
        // Create initial conversation
        const newConv = await api.createConversation(doc.id, `Chat with ${doc.original_filename}`);
        setConversations([newConv]);
        setCurrentConvId(newConv.id);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [doc.id]);

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await api.getMessages(convId);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleSelectConversation = (convId: string) => {
    if (isStreaming) handleStopGeneration();
    setCurrentConvId(convId);
    loadMessages(convId);
  };

  const handleNewConversation = async () => {
    if (isStreaming) handleStopGeneration();
    try {
      const newConv = await api.createConversation(doc.id, `Chat #${conversations.length + 1}`);
      setConversations([newConv, ...conversations]);
      setCurrentConvId(newConv.id);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await api.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (currentConvId === convId) {
        if (remaining.length > 0) {
          setCurrentConvId(remaining[0].id);
          loadMessages(remaining[0].id);
        } else {
          handleNewConversation();
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const question = customPrompt || inputQuestion.trim();
    if (!question || isStreaming) return;

    if (!customPrompt) setInputQuestion("");

    // Create temporary optimistic User message
    const userMsg: Message = {
      id: "temp-user-" + Date.now(),
      conversation_id: currentConvId || "",
      role: "user",
      content: question,
      created_at: new Date().toISOString(),
    };

    // Create temporary Assistant message for streaming
    const assistantMsg: Message = {
      id: "temp-asst-" + Date.now(),
      conversation_id: currentConvId || "",
      role: "assistant",
      content: "",
      sources: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: doc.id,
          conversation_id: currentConvId,
          question: question,
          debug_mode: debugMode,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat API error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let capturedSources: SourceChunk[] = [];
      let latestDebug: DebugInfo | null = null;
      let accumulatedContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            const eventType = line.replace("event:", "").trim();
            continue;
          }
          if (line.startsWith("data:")) {
            const dataStr = line.replace("data:", "").trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.sources) {
                capturedSources = parsed.sources;
                if (parsed.debug_info) {
                  latestDebug = parsed.debug_info;
                  setActiveDebugInfo(parsed.debug_info);
                }
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === "assistant") {
                    last.sources = capturedSources;
                    last.debug_info = latestDebug;
                  }
                  return copy;
                });
              }

              if (parsed.token) {
                accumulatedContent += parsed.token;
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === "assistant") {
                    last.content = accumulatedContent;
                  }
                  return copy;
                });
              }

              if (parsed.full_text) {
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === "assistant") {
                    last.id = parsed.message_id || last.id;
                    last.content = parsed.full_text;
                    last.sources = capturedSources;
                    last.debug_info = latestDebug;
                  }
                  return copy;
                });
              }

              if (parsed.error) {
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === "assistant") {
                    last.content = "⚠️ " + parsed.error;
                  }
                  return copy;
                });
              }
            } catch (err) {
              console.warn("SSE parse chunk error:", err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Streaming error:", err);
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            last.content =
              last.content || "⚠️ Failed to receive response from Ollama. Please ensure Ollama is active.";
          }
          return copy;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRegenerate = () => {
    if (messages.length < 2 || isStreaming) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      // Remove last assistant message and re-send
      setMessages((prev) => prev.slice(0, -1));
      handleSendMessage(lastUserMsg.content);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* Sidebar: Document Details & Conversations */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Back & New Chat */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Back to library"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNewConversation}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Conversation</span>
            </button>
          </div>

          {/* Document Info Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-start space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 text-xs font-bold uppercase shrink-0">
                {doc.file_type}
              </div>
              <div className="truncate flex-1">
                <h3 className="text-xs font-semibold text-white truncate" title={doc.original_filename}>
                  {doc.original_filename}
                </h3>
                <span className="text-[10px] text-emerald-400 font-medium">● RAG Scope Active</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="flex items-center space-x-1">
                <Layers className="w-3 h-3 text-slate-500" />
                <span>{doc.total_chunks} chunks</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="w-3 h-3 text-slate-500" />
                <span>{doc.total_pages} {doc.total_pages === 1 ? "page" : "pages"}</span>
              </div>
            </div>
          </div>

          {/* Conversations List */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
              Conversations
            </h4>
            <div className="space-y-1">
              {conversations.map((conv) => {
                const active = conv.id === currentConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer group transition ${
                      active
                        ? "bg-slate-800 text-white font-semibold border border-slate-700"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <span className="truncate pr-2">{conv.title}</span>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-rose-400 transition"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Debug Toggle Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-slate-300 font-medium">Debug Mode</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
        {/* Chat Header */}
        <div className="h-12 border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center space-x-2">
            <button
              onClick={onBack}
              className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400">Talking with:</span>
            <span className="text-xs font-semibold text-emerald-400 truncate max-w-xs sm:max-w-md">
              📄 {doc.original_filename}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {messages.length > 0 && (
              <button
                onClick={handleRegenerate}
                disabled={isStreaming}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center space-x-1 transition disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
            )}

            {debugMode && activeDebugInfo && (
              <button
                onClick={() => setIsDebugDrawerOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center space-x-1"
              >
                <Bug className="w-3 h-3" />
                <span>Inspector</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-4 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-xl">
                <Bot className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Ask questions about your document</h3>
                <p className="text-xs text-slate-400">
                  MyDocs retrieves exact context passages from "{doc.original_filename}" and answers directly without hallucination.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full pt-2">
                <button
                  onClick={() => handleSendMessage("What is the main purpose of this document?")}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-xs text-left text-slate-300 hover:text-white transition"
                >
                  "What is the main purpose of this document?"
                </button>
                <button
                  onClick={() => handleSendMessage("Summarize the key points and findings.")}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-xs text-left text-slate-300 hover:text-white transition"
                >
                  "Summarize the key points and findings."
                </button>
              </div>
            </div>
          ) : (
            <div>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onOpenDebug={(info) => {
                    setActiveDebugInfo(info);
                    setIsDebugDrawerOpen(true);
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-900">
          <div className="max-w-4xl mx-auto relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask a question about ${doc.original_filename}... (Enter to send, Shift+Enter for newline)`}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 pr-24 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none shadow-xl"
            />

            <div className="absolute right-3 bottom-3 flex items-center space-x-1.5">
              {isStreaming ? (
                <button
                  onClick={handleStopGeneration}
                  className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold flex items-center space-x-1 shadow-lg shadow-rose-500/20 transition"
                  title="Stop generating"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputQuestion.trim()}
                  className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition disabled:opacity-30 disabled:hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-center text-slate-500 mt-2">
            Strict RAG Pipeline • Only searches chunks belonging to document ID {doc.id.substring(0, 8)}...
          </p>
        </div>
      </main>

      {/* Debug Inspector Drawer */}
      <DebugDrawer
        isOpen={isDebugDrawerOpen}
        onClose={() => setIsDebugDrawerOpen(false)}
        debugInfo={activeDebugInfo}
      />
    </div>
  );
};