import React, { useState, useEffect, useCallback } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WorkspaceProvider, useWorkspace } from "./contexts/WorkspaceContext";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { HomeOverview } from "./components/HomeOverview";
import { DriveView } from "./components/DriveView";
import { WikiView } from "./components/WikiView";
import { WikiPageReader } from "./components/WikiPageReader";
import { DocumentViewerModal } from "./components/DocumentViewerModal";
import { ShareDialog } from "./components/ShareDialog";
import { NewFileDialog } from "./components/NewFileDialog";
import { WikiEditorModal } from "./components/WikiEditorModal";
import { WikiHistoryModal } from "./components/WikiHistoryModal";
import { UnifiedSearchDialog } from "./components/UnifiedSearchDialog";
import { LekkiAIPanel } from "./components/LekkiAIPanel";
import {
  DriveFile,
  DriveFolder,
  WikiPage,
  NavView,
} from "./types/lekki";
import { drive, wiki } from "./lib/api";

function LekkiMain() {
  const { user, allUsers } = useAuth();
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();

  // Navigation State
  const [currentView, setCurrentView] = useState<NavView>("home");

  // Domain Data State
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);

  // Dialogs & Modals State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiInitialQuestion, setAIInitialQuestion] = useState<string | undefined>(undefined);

  const [viewingFile, setViewingFile] = useState<DriveFile | null>(null);
  const [sharingFile, setSharingFile] = useState<DriveFile | null>(null);
  const [isNewFileOpen, setIsNewFileOpen] = useState(false);
  const [newFileFolderId, setNewFileFolderId] = useState<string | null>(null);

  // Wiki State
  const [activeWikiPage, setActiveWikiPage] = useState<WikiPage | null>(null);
  const [editingWikiPage, setEditingWikiPage] = useState<WikiPage | null>(null);
  const [wikiEditorTopic, setWikiEditorTopic] = useState<string | undefined>();
  const [wikiEditorSection, setWikiEditorSection] = useState<string | undefined>();
  const [isWikiEditorOpen, setIsWikiEditorOpen] = useState(false);
  const [historyWikiPage, setHistoryWikiPage] = useState<WikiPage | null>(null);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch all domain data according to current scope
  const refreshData = useCallback(async () => {
    try {
      // Determine scope
      let fileScope: "personal" | "shared_with_me" | "starred" | "trash" | "workspace" | "all" = "all";
      if (currentView === "my_docs") fileScope = "personal";
      else if (currentView === "shared_with_me") fileScope = "shared_with_me";
      else if (currentView === "starred") fileScope = "starred";
      else if (currentView === "trash") fileScope = "trash";
      else if (currentView === "workspace_files") fileScope = "workspace";

      const [loadedFiles, loadedFolders, loadedWiki] = await Promise.all([
        drive.getFiles({
          scope: fileScope,
          workspace_id: currentView === "workspace_files" ? activeWorkspaceId : undefined,
        }),
        drive.getFolders({
          workspace_id: currentView === "workspace_files" ? activeWorkspaceId : undefined,
        }),
        wiki.getPages({
          workspace_id: activeWorkspaceId || undefined,
        }),
      ]);

      setFiles(loadedFiles);
      setFolders(loadedFolders);
      setWikiPages(loadedWiki);
    } catch {
      // Safe fallback
    }
  }, [currentView, activeWorkspaceId]);

  useEffect(() => {
    refreshData();
  }, [refreshData, user?.id]);

  // Sidebar Counts
  const counts = {
    myDocs: files.filter((f) => !f.workspace_id && !f.is_deleted).length,
    starred: files.filter((f) => f.is_starred && !f.is_deleted).length,
    sharedWithMe: files.filter((f) => (f.shared_with || []).includes(user?.id || "") && !f.is_deleted).length,
    trash: files.filter((f) => f.is_deleted).length,
    workspaceFiles: files.filter((f) => f.workspace_id === activeWorkspaceId && !f.is_deleted).length,
    workspaceWiki: wikiPages.length,
  };

  const handleOpenDocFromId = async (docId: string) => {
    try {
      const doc = await drive.getFile(docId);
      setViewingFile(doc);
    } catch {
      // If in current files list
      const found = files.find((f) => f.id === docId);
      if (found) setViewingFile(found);
    }
  };

  const handleOpenWikiFromId = async (wikiId: string) => {
    try {
      const page = await wiki.getPage(wikiId);
      setActiveWikiPage(page);
      setCurrentView("workspace_wiki");
    } catch {
      const found = wikiPages.find((w) => w.id === wikiId);
      if (found) {
        setActiveWikiPage(found);
        setCurrentView("workspace_wiki");
      }
    }
  };

  const handleAskAIAboutFile = (file: DriveFile) => {
    setAIInitialQuestion(`Explique-moi le contenu du document « ${file.name} »`);
    setIsAIOpen(true);
  };

  const handleAskAIAboutWiki = (page: WikiPage, customQuestion?: string) => {
    setAIInitialQuestion(
      customQuestion || `Résume et explique la notion « ${page.title} » du Wiki`
    );
    setIsAIOpen(true);
  };

  const handleCreateWikiFromDoc = (file: DriveFile) => {
    setWikiEditorTopic("Réseaux");
    setWikiEditorSection("Synthèses de cours");
    setEditingWikiPage({
      id: "",
      title: `Synthèse : ${file.name.replace(/\.[^/.]+$/, "")}`,
      content: `# ${file.name.replace(/\.[^/.]+$/, "")}\n\nFiche de synthèse établie à partir du document original **${file.name}**.\n\n## 1. Contexte\n\n## 2. Synthèse des notions clés\n\n${file.summary || ""}`,
      category: "cours",
      topic: "Réseaux",
      section: "Synthèses de cours",
      status: "draft",
      workspace_id: activeWorkspaceId || "",
      creator_id: user?.id || "",
      creator_name: user?.name || "Auteur",
      last_editor_id: user?.id || "",
      view_count: 0,
      author_name: user?.name || "Auteur",
      current_version: 1,
      related_document_ids: [file.id],
      history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsWikiEditorOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0D0F12] text-zinc-100 overflow-hidden select-none font-sans">
      {/* Top Application Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleAI={() => setIsAIOpen((prev) => !prev)}
        isAIOpen={isAIOpen}
      />

      {/* Main Split Layout: Sidebar + Active View */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar
          currentView={currentView}
          onSelectView={(view) => {
            setCurrentView(view);
            setActiveWikiPage(null);
          }}
          onOpenNewFile={() => {
            setNewFileFolderId(null);
            setIsNewFileOpen(true);
          }}
          onOpenNewWiki={() => {
            setEditingWikiPage(null);
            setIsWikiEditorOpen(true);
          }}
          counts={counts}
        />

        {/* Dynamic Center Stage View */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0E1116] overflow-hidden">
          {currentView === "home" && (
            <HomeOverview
              files={files}
              wikiPages={wikiPages}
              activeWorkspace={activeWorkspace}
              onNavigate={(v) => {
                setCurrentView(v);
                setActiveWikiPage(null);
              }}
              onOpenFile={(f) => setViewingFile(f)}
              onOpenWiki={(p) => {
                setActiveWikiPage(p);
                setCurrentView("workspace_wiki");
              }}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenAI={() => setIsAIOpen(true)}
            />
          )}

          {(currentView === "my_docs" ||
            currentView === "starred" ||
            currentView === "shared_with_me" ||
            currentView === "trash" ||
            currentView === "workspace_files") && (
            <DriveView
              currentView={currentView}
              files={files}
              folders={folders}
              activeWorkspaceName={activeWorkspace?.name}
              currentUser={user}
              onOpenFile={(f) => setViewingFile(f)}
              onOpenShare={(f) => setSharingFile(f)}
              onNewFileClick={(folderId) => {
                setNewFileFolderId(folderId || null);
                setIsNewFileOpen(true);
              }}
              onRefresh={refreshData}
              onAskAIAboutFile={handleAskAIAboutFile}
            />
          )}

          {currentView === "workspace_wiki" && (
            activeWikiPage ? (
              <WikiPageReader
                page={activeWikiPage}
                availableFiles={files}
                allPages={wikiPages}
                onBack={() => setActiveWikiPage(null)}
                onNavigateTopic={() => setActiveWikiPage(null)}
                onSelectPage={(p) => setActiveWikiPage(p)}
                onEdit={(p) => {
                  setEditingWikiPage(p);
                  setWikiEditorTopic(p.topic);
                  setWikiEditorSection(p.section);
                  setIsWikiEditorOpen(true);
                }}
                onViewHistory={(p) => setHistoryWikiPage(p)}
                onOpenDoc={handleOpenDocFromId}
                onAskAI={handleAskAIAboutWiki}
                onStatusChanged={(updated) => {
                  setActiveWikiPage(updated);
                  refreshData();
                }}
              />
            ) : (
              <WikiView
                pages={wikiPages}
                availableFiles={files}
                activeWorkspaceName={activeWorkspace?.name}
                onSelectPage={(p) => setActiveWikiPage(p)}
                onNewPageClick={(topic, section) => {
                  setEditingWikiPage(null);
                  setWikiEditorTopic(topic);
                  setWikiEditorSection(section);
                  setIsWikiEditorOpen(true);
                }}
              />
            )
          )}
        </main>

        {/* Lekki AI Conversational Panel */}
        <LekkiAIPanel
          open={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          onOpenDoc={handleOpenDocFromId}
          onOpenWiki={handleOpenWikiFromId}
          initialQuestion={aiInitialQuestion}
        />
      </div>

      {/* Unified Global Search Modal (Cmd+K) */}
      <UnifiedSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelectDocument={handleOpenDocFromId}
        onSelectWiki={handleOpenWikiFromId}
        onAskAI={(q) => {
          setAIInitialQuestion(q);
          setIsAIOpen(true);
        }}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        file={viewingFile}
        open={Boolean(viewingFile)}
        onOpenChange={(open) => !open && setViewingFile(null)}
        onAskAIAboutDoc={handleAskAIAboutFile}
        onCreateWikiFromDoc={handleCreateWikiFromDoc}
        onShareDoc={(f) => setSharingFile(f)}
      />

      {/* Share Document Dialog */}
      <ShareDialog
        file={sharingFile}
        open={Boolean(sharingFile)}
        onOpenChange={(open) => !open && setSharingFile(null)}
        allUsers={allUsers}
        currentUser={user}
        onFileUpdated={(updated) => {
          setSharingFile(null);
          refreshData();
        }}
      />

      {/* New File / Upload Dialog */}
      <NewFileDialog
        open={isNewFileOpen}
        onOpenChange={setIsNewFileOpen}
        folders={folders}
        defaultWorkspaceId={currentView === "workspace_files" ? activeWorkspaceId : null}
        defaultFolderId={newFileFolderId}
        onFileCreated={() => refreshData()}
      />

      {/* Wiki Editor Modal */}
      <WikiEditorModal
        page={editingWikiPage}
        open={isWikiEditorOpen}
        onOpenChange={setIsWikiEditorOpen}
        availableFiles={files}
        allWikiPages={wikiPages}
        activeWorkspaceId={activeWorkspaceId}
        defaultTopic={wikiEditorTopic}
        defaultSection={wikiEditorSection}
        onSaved={(saved) => {
          if (activeWikiPage?.id === saved.id) {
            setActiveWikiPage(saved);
          }
          refreshData();
        }}
      />

      {/* Wiki History & Restore Modal */}
      <WikiHistoryModal
        page={historyWikiPage}
        open={Boolean(historyWikiPage)}
        onOpenChange={(open) => !open && setHistoryWikiPage(null)}
        onVersionRestored={(restored) => {
          if (activeWikiPage?.id === restored.id) {
            setActiveWikiPage(restored);
          }
          refreshData();
        }}
      />

      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <WorkspaceProvider>
          <LekkiMain />
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
