import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Toaster, toast } from "sonner";
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
import { WorkspaceAdminDialog } from "./components/WorkspaceAdminDialog";
import { WikiEditorModal } from "./components/WikiEditorModal";
import { WikiHistoryModal } from "./components/WikiHistoryModal";
import { LekkiAIPanel } from "./components/LekkiAIPanel";
import { RevisionPanel, RevisionMode } from "./components/RevisionPanel";
import { ImportFolderDialog } from "./components/ImportFolderDialog";
import { DriveImportDialog } from "./components/DriveImportDialog";
import { MobileTabBar } from "./components/MobileTabBar";
import { OfflineBanner } from "./components/OfflineBanner";
import { ScanSubjectDialog } from "./components/ScanSubjectDialog";
import { takePendingDoc, takePendingJoin } from "./lib/pendingLinks";
import { SubjectsView } from "./components/SubjectsView";
import { SubjectView } from "./components/SubjectView";
import { buildLibrary, wikiTopicFor } from "./lib/library";
import { LoginView } from "./components/LoginView";
import { RegisterView } from "./components/RegisterView";
import { UpdateNotifier } from "./components/UpdateNotifier";
import { AuthSplash, LandingPage } from "./components/LandingPage";
import { Redirect, Route, Switch } from "wouter";
import {
  DriveFile,
  DriveFolder,
  WikiPage,
  NavView,
} from "./types/lekki";
import { fileUrl, drive, wiki } from "./lib/api";

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginView} />
      <Route path="/register" component={RegisterView} />
      <Route path="/" component={LandingPage} />
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function LekkiMain() {
  const { user, allUsers } = useAuth();
  const { activeWorkspace, activeWorkspaceId, setActiveWorkspace, joinWorkspace } = useWorkspace();
  const canManageWiki = Boolean(
    user?.role === "admin" ||
    activeWorkspace?.owner_id === user?.id ||
    ["owner", "admin"].includes(activeWorkspace?.role || "")
  );


  // Navigation State
  const [currentView, setCurrentView] = useState<NavView>("home");

  // Domain Data State
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [allFiles, setAllFiles] = useState<DriveFile[]>([]);
  const [personalFiles, setPersonalFiles] = useState<DriveFile[]>([]);
  const [trashedFiles, setTrashedFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [spaceFolders, setSpaceFolders] = useState<DriveFolder[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
  const [loadedDataKey, setLoadedDataKey] = useState<string | null>(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const refreshSequence = useRef(0);
  const driveDataKey = `${currentView}:${activeWorkspaceId || "none"}:${user?.id || "anon"}`;

  // Dialogs & Modals State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiInitialQuestion, setAIInitialQuestion] = useState<string | undefined>(undefined);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [driveImport, setDriveImport] = useState<{ open: boolean; folderId: string | null }>({ open: false, folderId: null });
  const [scan, setScan] = useState<{ open: boolean; subjectId: string | null; folderId: string | null }>({
    open: false,
    subjectId: null,
    folderId: null,
  });
  const [revision, setRevision] = useState<{
    open: boolean; mode: RevisionMode; fileId?: string | null; subjectId?: string | null;
  }>({ open: false, mode: "quiz" });
  const openRevision = (mode: RevisionMode, fileId?: string | null, subjectId?: string | null) =>
    setRevision({ open: true, mode, fileId, subjectId });
  const askLekki = (question: string) => {
    setAIInitialQuestion(question);
    setIsAIOpen(true);
  };

  const [viewingFile, setViewingFile] = useState<DriveFile | null>(null);
  const [sharingFile, setSharingFile] = useState<DriveFile | null>(null);
  const [isNewFileOpen, setIsNewFileOpen] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [newFileFolderId, setNewFileFolderId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Wiki State
  const [activeWikiPage, setActiveWikiPage] = useState<WikiPage | null>(null);
  const [wikiFilterTopic, setWikiFilterTopic] = useState<string | null>(null);
  const [editingWikiPage, setEditingWikiPage] = useState<WikiPage | null>(null);
  const [wikiEditorTopic, setWikiEditorTopic] = useState<string | undefined>();
  const [wikiEditorSection, setWikiEditorSection] = useState<string | undefined>();
  const [wikiEditorKind, setWikiEditorKind] = useState<"page" | "organization">("page");
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
    const requestId = ++refreshSequence.current;
    setDriveLoading(true);
    try {
      // Determine scope
      let fileScope: "personal" | "shared_with_me" | "starred" | "trash" | "workspace" | "all" = "all";
      if (currentView === "my_docs") fileScope = "personal";
      else if (currentView === "shared_with_me") fileScope = "shared_with_me";
      else if (currentView === "starred") fileScope = "starred";
      else if (currentView === "trash") fileScope = "trash";
      else if (currentView === "workspace_files") fileScope = "workspace";

      const [loadedFiles, loadedFolders, loadedWiki, loadedAllFiles, loadedTrashFiles, loadedPersonalFiles, loadedSpaceFolders] = await Promise.all([
        currentView === "workspace_files" && !activeWorkspaceId
          ? Promise.resolve([] as DriveFile[])
          : drive.getFiles({
              scope: fileScope,
              workspace_id: currentView === "workspace_files" ? activeWorkspaceId : undefined,
            }).catch(() => null),
        currentView === "workspace_files" && !activeWorkspaceId
          ? Promise.resolve([] as DriveFolder[])
          : drive.getFolders({
              workspace_id: currentView === "workspace_files" ? activeWorkspaceId : undefined,
            }).catch(() => null),
        activeWorkspaceId
          ? wiki.getPages({ workspace_id: activeWorkspaceId }).catch(() => null)
          : Promise.resolve([] as WikiPage[]),
        drive.getFiles({ scope: "all" }).catch(() => null),
        drive.getFiles({ scope: "trash" }).catch(() => null),
        drive.getFiles({ scope: "personal" }).catch(() => null),
        activeWorkspaceId
          ? drive.getFolders({ workspace_id: activeWorkspaceId }).catch(() => null)
          : Promise.resolve([] as DriveFolder[]),
      ]);

      if (requestId !== refreshSequence.current) return;

      if (Array.isArray(loadedFiles)) setFiles(loadedFiles);
      if (Array.isArray(loadedAllFiles)) setAllFiles(loadedAllFiles);
      if (Array.isArray(loadedTrashFiles)) setTrashedFiles(loadedTrashFiles);
      if (Array.isArray(loadedPersonalFiles)) setPersonalFiles(loadedPersonalFiles);
      if (Array.isArray(loadedFolders)) setFolders(loadedFolders);
      if (Array.isArray(loadedSpaceFolders)) setSpaceFolders(loadedSpaceFolders);
      if (Array.isArray(loadedWiki)) setWikiPages(loadedWiki);
      setLoadedDataKey(driveDataKey);
    } catch {
      if (requestId !== refreshSequence.current) return;
      setLoadedDataKey(driveDataKey);
    } finally {
      if (requestId === refreshSequence.current) setDriveLoading(false);
    }
  }, [currentView, activeWorkspaceId, user?.id, driveDataKey]);

  const handleDeleteWikiPage = async (page: WikiPage) => {
    if (!window.confirm(`Supprimer définitivement la page « ${page.title} » et son historique ?`)) return;
    try {
      await wiki.deletePage(page.id);
      setActiveWikiPage(null);
      toast.success(`La page « ${page.title} » a été supprimée`);
      await refreshData();
    } catch {
      toast.error("Impossible de supprimer cette page : il faut être admin de l’espace.");
    }
  };

  const handleDeleteWikiSection = async (topic: string, section: string, pageCount: number) => {
    if (!activeWorkspaceId) return;
    const confirmed = window.confirm(
      `Supprimer la section « ${section} » du pôle « ${topic} » ?\n\n` +
        `${pageCount} page${pageCount > 1 ? "s" : ""} et leur historique seront définitivement supprimés. ` +
        "Cette action est irréversible."
    );
    if (!confirmed) return;
    try {
      const result = await wiki.deleteSection(activeWorkspaceId, topic, section);
      if (activeWikiPage && wikiPages.some((page) => page.topic === topic && page.section === section && page.id === activeWikiPage.id)) {
        setActiveWikiPage(null);
      }
      toast.success(`Section supprimée · ${result.deleted_pages} page${result.deleted_pages === 1 ? "" : "s"} supprimée${result.deleted_pages === 1 ? "" : "s"}`);
      await refreshData();
    } catch {
      toast.error("Impossible de supprimer cette section : il faut être admin de l’espace.");
    }
  };

  useEffect(() => {
    refreshData();
  }, [refreshData, user?.id]);

  useEffect(() => {
    if (!activeWorkspaceId && (currentView === "workspace_files" || currentView === "workspace_wiki")) {
      setCurrentView("home");
      setActiveWikiPage(null);
      setWikiFilterTopic(null);
    }
  }, [activeWorkspaceId, currentView]);

  // Sidebar Counts
  // Bibliothèque de l'espace actif : chaque document rangé sous sa matière.
  const spaceFiles = useMemo(
    () => allFiles.filter((file) => (activeWorkspaceId ? file.workspace_id === activeWorkspaceId : !file.workspace_id)),
    [allFiles, activeWorkspaceId]
  );
  const library = useMemo(
    () => buildLibrary(spaceFiles, spaceFolders, wikiPages, activeWorkspace),
    [spaceFiles, spaceFolders, wikiPages, activeWorkspace]
  );
  const openSubject = (subjectId: string) => {
    setActiveSubjectId(subjectId);
    setCurrentView("subject");
  };
  const activeShelf = activeSubjectId ? library.shelves.get(activeSubjectId) : undefined;

  const counts = {
    myDocs: personalFiles.length,
    starred: allFiles.filter((f) => f.is_starred).length,
    sharedWithMe: allFiles.filter((f) => (f.shared_with || []).includes(user?.id || "")).length,
    trash: trashedFiles.length,
    workspaceFiles: allFiles.filter((f) => f.workspace_id === activeWorkspaceId).length,
    workspaceWiki: wikiPages.length,
  };

  const handleFileTrashed = (file: DriveFile, permanentlyDeleted = false) => {
    setFiles((current) => current.filter((item) => item.id !== file.id));
    setAllFiles((current) => current.filter((item) => item.id !== file.id));
    setPersonalFiles((current) => current.filter((item) => item.id !== file.id));
    setTrashedFiles((current) => {
      if (permanentlyDeleted) return current.filter((item) => item.id !== file.id);
      if (current.some((item) => item.id === file.id)) return current;
      return [...current, { ...file, is_deleted: true }];
    });
  };

  const handleFileRestored = (file: DriveFile) => {
    setTrashedFiles((current) => current.filter((item) => item.id !== file.id));
    setAllFiles((current) => {
      if (current.some((item) => item.id === file.id)) return current;
      return [...current, { ...file, is_deleted: false }];
    });
    setFiles((current) => {
      if (currentView === "trash") return current.filter((item) => item.id !== file.id);
      if (current.some((item) => item.id === file.id)) return current;
      return [...current, { ...file, is_deleted: false }];
    });
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

  // Liens reçus sur WhatsApp (voir lib/pendingLinks) : traités une fois connecté.
  useEffect(() => {
    const code = takePendingJoin();
    if (code) {
      void joinWorkspace(code)
        .then((space) => {
          setCurrentView("home");
          toast.success(`Bienvenue dans « ${space.name} » !`);
        })
        .catch((error) => toast.error(error instanceof Error ? error.message : "Ce code d’invitation n’est plus valable."));
    }
    const docId = takePendingDoc();
    if (docId) {
      void drive
        .getFile(docId)
        .then((doc) => {
          if (doc.workspace_id) setActiveWorkspace(doc.workspace_id);
          setViewingFile(doc);
        })
        .catch(() => toast.error("Ce document n’existe plus, ou il appartient à un espace dont tu n’es pas membre."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenWikiFromId = async (wikiId: string) => {
    try {
      const page = await wiki.getPage(wikiId);
      if (page.workspace_id && page.workspace_id !== activeWorkspaceId) {
        setActiveWorkspace(page.workspace_id);
      }
      setActiveWikiPage(page);
      setCurrentView("workspace_wiki");
    } catch {
      const found = wikiPages.find((w) => w.id === wikiId);
      if (found) {
        if (found.workspace_id && found.workspace_id !== activeWorkspaceId) {
          setActiveWorkspace(found.workspace_id);
        }
        setActiveWikiPage(found);
        setCurrentView("workspace_wiki");
      }
    }
  };

  const handleOpenFileInBrowser = (file: DriveFile) => {
    window.location.assign(fileUrl(`/drive/files/${file.id}/download`));
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
    <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#0D0F12] font-sans text-zinc-100">
      {/* Top Application Header */}
      <Header
        onSelectDocument={handleOpenDocFromId}
        onSelectWiki={handleOpenWikiFromId}
        onAskAI={(q) => {
          setAIInitialQuestion(q);
          setIsAIOpen(true);
        }}
        onToggleAI={() => setIsAIOpen((prev) => !prev)}
        isAIOpen={isAIOpen}
        onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
      />
      <OfflineBanner />

      {/* Main Split Layout: Sidebar + Active View */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar
          currentView={currentView}
          onSelectView={(view) => {
            setCurrentView(view);
            setActiveWikiPage(null);
            setWikiFilterTopic(null);
          }}
          counts={counts}
          onOpenWorkspaceSettings={() => setShowAdminDialog(true)}
          onOpenRevision={() => openRevision("quiz")}
          mobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
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
                setWikiFilterTopic(null);
              }}
              onOpenFile={(file) => setViewingFile(file)}
              onOpenWiki={(p) => {
                setActiveWikiPage(p);
                setCurrentView("workspace_wiki");
                setWikiFilterTopic(null);
              }}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenAI={() => setIsAIOpen(true)}
              onAsk={askLekki}
              onOpenRevision={openRevision}
              onScan={() => setScan({ open: true, subjectId: null, folderId: null })}
              library={library}
              onOpenSubject={openSubject}
            />
          )}

          {currentView === "subjects" && (
            <SubjectsView
              library={library}
              workspace={activeWorkspace}
              onOpenSubject={openSubject}
              onOpenFile={(file) => setViewingFile(file)}
              onFoldersCreated={() => void refreshData()}
            />
          )}

          {currentView === "subject" &&
            (activeShelf ? (
              <SubjectView
                shelf={activeShelf}
                onBack={() => setCurrentView("subjects")}
                onOpenFile={(file) => setViewingFile(file)}
                onOpenWiki={(p) => {
                  setActiveWikiPage(p);
                  setCurrentView("workspace_wiki");
                  setWikiFilterTopic(null);
                }}
                onAsk={askLekki}
                onOpenRevision={openRevision}
                onWriteNote={() => {
                  setEditingWikiPage(null);
                  setWikiEditorTopic(wikiTopicFor(activeShelf.subject));
                  setWikiEditorSection("Fiches de révision");
                  setWikiEditorKind("page");
                  setIsWikiEditorOpen(true);
                }}
                onAddDocuments={() => setCurrentView("workspace_files")}
                onScan={() => setScan({ open: true, subjectId: activeShelf.subject.id, folderId: null })}
              />
            ) : (
              <SubjectsView
                library={library}
                workspace={activeWorkspace}
                onOpenSubject={openSubject}
                onOpenFile={(file) => setViewingFile(file)}
                onFoldersCreated={() => void refreshData()}
              />
            ))}

          {(currentView === "my_docs" ||
            currentView === "starred" ||
            currentView === "shared_with_me" ||
            currentView === "trash" ||
            currentView === "workspace_files") && (
            <DriveView
              key={currentView}
              currentView={currentView}
              files={loadedDataKey === driveDataKey ? files : []}
              folders={folders}
              loading={driveLoading || loadedDataKey !== driveDataKey}
              activeWorkspaceId={activeWorkspaceId}
              activeWorkspaceName={activeWorkspace?.name}
              currentUser={user}
              onOpenFile={(file) => setViewingFile(file)}
              onOpenShare={(f) => setSharingFile(f)}
              onNewFileClick={(folderId) => {
                setNewFileFolderId(folderId || null);
                setIsNewFileOpen(true);
              }}
              onScanClick={(folderId) => setScan({ open: true, subjectId: null, folderId: folderId || null })}
              onImportFolderClick={(folderId) => {
                setNewFileFolderId(folderId || null);
                setIsImportOpen(true);
              }}
              onDriveImportClick={(folderId) => setDriveImport({ open: true, folderId: folderId || null })}
              onRefresh={refreshData}
              onFileTrashed={handleFileTrashed}
              onFileRestored={handleFileRestored}
              onAskAIAboutFile={handleAskAIAboutFile}
            />
          )}

          {currentView === "workspace_wiki" && (
            activeWikiPage ? (
              <WikiPageReader
                page={activeWikiPage}
                availableFiles={files}
                allPages={wikiPages}
                canVerifyWiki={Boolean(
                  user?.role === "admin" ||
                  activeWorkspace?.owner_id === user?.id ||
                  ["owner", "admin", "verifier"].includes(activeWorkspace?.role || "")
                )}
                canManageWiki={canManageWiki}
                onBack={() => {
                  setActiveWikiPage(null);
                  setWikiFilterTopic(null);
                }}
                onNavigateTopic={(topic) => {
                  setWikiFilterTopic(topic);
                  setActiveWikiPage(null);
                }}
                onSelectPage={(p) => setActiveWikiPage(p)}
                onEdit={(p) => {
                  setEditingWikiPage(p);
                  setWikiEditorTopic(p.topic);
                  setWikiEditorSection(p.section);
                  setWikiEditorKind("page");
                  setIsWikiEditorOpen(true);
                }}
                onViewHistory={(p) => setHistoryWikiPage(p)}
                onOpenDoc={handleOpenDocFromId}
                onAskAI={handleAskAIAboutWiki}
                onStatusChanged={(updated) => {
                  setActiveWikiPage(updated);
                  refreshData();
                }}
                onDeletePage={handleDeleteWikiPage}
              />
            ) : (
              <WikiView
                pages={wikiPages}
                availableFiles={files}
                canManageWiki={canManageWiki}
                onSelectPage={(p) => setActiveWikiPage(p)}
                onDeleteSection={handleDeleteWikiSection}
                onNewPageClick={(topic, section, kind = "page") => {
                  setEditingWikiPage(null);
                  setWikiEditorTopic(topic);
                  setWikiEditorSection(section);
                  setWikiEditorKind(kind);
                  setIsWikiEditorOpen(true);
                }}
                filterTopic={wikiFilterTopic}
                onClearFilter={() => setWikiFilterTopic(null)}
                onNavigateToTopic={(topic) => setWikiFilterTopic(topic)}
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

        {/* Mode révision : quiz et correction d'anciens sujets */}
        <RevisionPanel
          open={revision.open}
          onClose={() => setRevision((current) => ({ ...current, open: false }))}
          library={library}
          spaceName={activeWorkspace?.name}
          initialMode={revision.mode}
          initialFileId={revision.fileId}
          initialSubjectId={revision.subjectId}
          onOpenDoc={(docId) => {
            setRevision((current) => ({ ...current, open: false }));
            void handleOpenDocFromId(docId);
          }}
        />
      </div>

      {/* Téléphone : onglets à portée du pouce */}
      <MobileTabBar
        currentView={currentView}
        activeWorkspace={activeWorkspace}
        revisionOpen={revision.open}
        aiOpen={isAIOpen}
        onNavigate={(view) => {
          setRevision((current) => ({ ...current, open: false }));
          setIsAIOpen(false);
          setCurrentView(view);
          setActiveWikiPage(null);
          setWikiFilterTopic(null);
        }}
        onOpenRevision={() => { setIsAIOpen(false); openRevision("quiz"); }}
        onOpenAI={() => { setRevision((current) => ({ ...current, open: false })); setIsAIOpen(true); }}
        onOpenMenu={() => setIsMobileSidebarOpen(true)}
      />

      {/* Document Viewer Modal (Fiche documentaire Lekki) */}
      <DocumentViewerModal
        file={viewingFile}
        open={Boolean(viewingFile)}
        onOpenChange={(open) => !open && setViewingFile(null)}
        onAskAIAboutDoc={handleAskAIAboutFile}
        onCreateWikiFromDoc={handleCreateWikiFromDoc}
        onShareDoc={(f) => setSharingFile(f)}
        onOpenWikiPage={(wikiId) => handleOpenWikiFromId(wikiId)}
        wikiPages={wikiPages}
        activeWorkspaceId={activeWorkspaceId}
        onSwitchWorkspace={setActiveWorkspace}
        subjectTitle={library.entries.find((entry) => entry.file.id === viewingFile?.id)?.subject?.title}
        onRevise={(file) => {
          const entry = library.entries.find((item) => item.file.id === file.id);
          setViewingFile(null);
          openRevision(entry?.info.isExam ? "correction" : "quiz", file.id, entry?.subject?.id);
        }}
      />

      {/* Import d'un dossier entier (cours, TD, sujets), arborescence conservée */}
      <ImportFolderDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        folders={folders}
        defaultWorkspaceId={currentView === "workspace_files" ? activeWorkspaceId : null}
        defaultFolderId={newFileFolderId}
        onImportCompleted={async () => {
          await refreshData();
        }}
      />

      {/* Import depuis Google Drive : SUP'DOCS (promo) ou Drive personnel */}
      <DriveImportDialog
        open={driveImport.open}
        onClose={() => setDriveImport((current) => ({ ...current, open: false }))}
        workspace={currentView === "workspace_files" ? activeWorkspace ?? null : null}
        folderId={driveImport.folderId}
        folderName={folders.find((folder) => folder.id === driveImport.folderId)?.name ?? null}
        onImported={refreshData}
      />

      {/* Photo d'un sujet papier → PDF lu par OCR */}
      <ScanSubjectDialog
        open={scan.open}
        onClose={() => setScan((current) => ({ ...current, open: false }))}
        library={library}
        workspaceId={currentView === "my_docs" ? null : activeWorkspaceId}
        folderId={scan.folderId}
        defaultSubjectId={scan.subjectId}
        onDone={() => void refreshData()}
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

      <WorkspaceAdminDialog open={showAdminDialog} onOpenChange={setShowAdminDialog} />

      {/* New File / Upload Dialog */}
      <NewFileDialog
        open={isNewFileOpen}
        onOpenChange={setIsNewFileOpen}
        folders={folders}
        defaultWorkspaceId={currentView === "workspace_files" ? activeWorkspaceId : null}
        defaultFolderId={newFileFolderId}
        onFileCreated={async (createdFile) => {
          const upsertFile = (current: DriveFile[]) =>
            current.some((file) => file.id === createdFile.id)
              ? current.map((file) =>
                  file.id === createdFile.id ? createdFile : file
                )
              : [createdFile, ...current];

          // Affiche le fichier dès que le serveur confirme sa création.
          setFiles(upsertFile);
          setAllFiles(upsertFile);
          if (!createdFile.workspace_id) {
            setPersonalFiles(upsertFile);
          }

          await refreshData();
        }}
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
        initialKind={wikiEditorKind}
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

    </div>
  );
}

function AuthGate() {
  const { user, ready } = useAuth();
  if (!ready) return <AuthSplash />;
  if (!user) return <PublicRoutes />;
  return <LekkiMain />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <WorkspaceProvider>
          <AuthGate />
          <Toaster position="bottom-right" richColors />
          <UpdateNotifier />
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
