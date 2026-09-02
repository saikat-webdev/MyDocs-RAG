import React, { useEffect, useState } from "react";
import { FileText, Database, Settings, HardDrive, ShieldCheck, Activity } from "lucide-react";
import { api } from "../services/api";
import { SystemHealth } from "../types";

interface NavbarProps {
  currentTab: "home" | "documents" | "settings" | "chat";
  onNavigate: (tab: "home" | "documents" | "settings") => void;
  activeDocName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate, activeDocName }) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await api.getHealth();
        setHealth(data);
      } catch (err) {
        console.error("Health fetch error:", err);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const isOllamaOnline = health?.ollama.available;

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center space-x-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
              <FileText className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-bold tracking-tight text-white">MyDocs</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Local AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Your private AI for your documents</p>
            </div>
          </button>

          {activeDocName && (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <span className="text-slate-400">Chatting with:</span>
              <span className="font-semibold text-emerald-400 flex items-center space-x-1 max-w-[200px] truncate">
                <span>📄</span>
                <span className="truncate">{activeDocName}</span>
              </span>
            </div>
          )}
        </div>

        <nav className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate("home")}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
              currentTab === "home"
                ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                : "text-slate-300 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Home
          </button>

          <button
            onClick={() => onNavigate("documents")}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
              currentTab === "documents"
                ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                : "text-slate-300 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Documents</span>
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
              currentTab === "settings"
                ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                : "text-slate-300 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Status</span>
          </button>

          <div className="pl-2 border-l border-slate-800 flex items-center space-x-2">
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOllamaOnline
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
              title={isOllamaOnline ? "Ollama & Qwen 2.5 3B Online" : "Ollama Disconnected"}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isOllamaOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="hidden sm:inline">
                {isOllamaOnline ? "Qwen2.5 3B Ready" : "Ollama Offline"}
              </span>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};