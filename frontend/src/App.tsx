import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";
import { DocumentLibraryPage } from "./pages/DocumentLibraryPage";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { Document } from "./types";

export function App() {
  const [currentTab, setCurrentTab] = useState<"home" | "documents" | "settings" | "chat">("home");
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);

  const handleOpenChat = (doc: Document) => {
    setActiveDocument(doc);
    setCurrentTab("chat");
  };

  const handleNavigate = (tab: "home" | "documents" | "settings") => {
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        activeDocName={activeDocument?.original_filename}
      />

      <div className="flex-1">
        {currentTab === "home" && (
          <HomePage
            onDocumentSelected={handleOpenChat}
            onNavigateLibrary={() => setCurrentTab("documents")}
          />
        )}

        {currentTab === "documents" && (
          <DocumentLibraryPage onOpenChat={handleOpenChat} />
        )}

        {currentTab === "chat" && activeDocument && (
          <ChatPage
            document={activeDocument}
            onBack={() => setCurrentTab("documents")}
          />
        )}

        {currentTab === "settings" && <SettingsPage />}
      </div>
    </div>
  );
}

export default App;