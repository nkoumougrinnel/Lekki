import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WorkspaceProvider, useWorkspace } from "./contexts/WorkspaceContext";
import { useCallback, useEffect, useState } from "react";
import { SidebarV2 } from "./components/SidebarV2";
import { HeaderV2 } from "./components/HeaderV2";
import { DashboardV2 } from "./components/DashboardV2";
import { MarkdownEditorV2 } from "./components/MarkdownEditorV2";
import { AIPanel } from "./components/AIPanel";
import { ImportDialog } from "./components/ImportDialog";
import { KnowledgeMapDialog } from "./components/KnowledgeMapDialog";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { AuditDashboard } from "./components/AuditDashboard";
import { LoginScreen } from "./components/LoginScreen";
import { Button } from "@/components/ui/button";
import { Bot, Loader2 } from "lucide-react";
import { pages as pagesApi, ApiError, type Page, type ApiUser } from "./lib/api";
import { WikiDocument } from "./types/wiki";

function pageToDoc(page: Page, currentUser: ApiUser | null): WikiDocument {
  return {
    id: page.id,
    title: page.title,
    content: page.content,
    parentId: null,
    createdAt: new Date(page.created_at),
    updatedAt: page.updated_at ? new Date(page.updated_at) : new Date(page.created_at),
    author:
      currentUser && page.creator_id === currentUser.id ? currentUser.username : "Équipe Lekki",
    tags: [],
    access: { public: page.status === "published", users: [], groups: [] },
    isFolder: false,
    category: page.category,
  } as WikiDocument;
}

function describeError(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function WikiApp() {
  const { user } = useAuth();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [selectedDoc, setSelectedDoc] = useState<WikiDocument | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [documents, setDocuments] = useState<WikiDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const canEdit = user?.role === "admin" || user?.role === "editor";
  // Analytics & Audit : Super Admin (admin global) ou propriétaire du workspace courant.
  const canSeeAnalytics =
    user?.role === "admin" || (!!activeWorkspace && activeWorkspace.owner_id === user?.id);
  const canSeeAudit = canSeeAnalytics;

  const loadPages = useCallback(async () => {
    if (!activeWorkspaceId) {
      setDocuments([]);
      setLoadingDocs(false);
      return;
    }
    setLoadingDocs(true);
    setLoadError(null);
    try {
      const list = await pagesApi.list({ limit: 100, workspaceId: activeWorkspaceId });
      setDocuments(list.map((p) => pageToDoc(p, user)));
    } catch (err) {
      setLoadError(describeError(err, "Impossible de charger les pages."));
    } finally {
      setLoadingDocs(false);
    }
  }, [user, activeWorkspaceId]);

  useEffect(() => {
    loadPages();
    // Le document ouvert peut appartenir à un autre workspace : on le referme.
    setSelectedDoc(null);
  }, [loadPages]);

  const handleCreateDocument = async (section: "prives" | "publics") => {
    if (!activeWorkspaceId) {
      toast.error("Sélectionnez d'abord un workspace.");
      return;
    }
    try {
      const page = await pagesApi.create({
        title: "Nouvelle page",
        content: "# Nouvelle page\n\n",
        category: "guides",
        workspace_id: activeWorkspaceId,
      });
      let doc = pageToDoc(page, user);
      // « Privés » = brouillon (non publié) ; « Publics » = publié (défaut backend).
      if (section === "prives") {
        const updated = await pagesApi.update(page.id, { status: "draft" });
        doc = pageToDoc(updated, user);
      }
      setDocuments((prev) => [...prev, doc]);
      setSelectedDoc(doc);
    } catch (err) {
      toast.error(describeError(err, "Création impossible."));
    }
  };

  const handleSaveDocument = async (content: string, title: string) => {
    if (!selectedDoc) return;
    try {
      const updated = await pagesApi.update(selectedDoc.id, {
        title: title.trim() || "Sans titre",
        content,
      });
      const doc = pageToDoc(updated, user);
      setSelectedDoc(doc);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
      toast.success("Page enregistrée");
    } catch (err) {
      toast.error(describeError(err, "Enregistrement impossible."));
    }
  };

  const openDocumentById = useCallback(
    async (id: string) => {
      const existing = documents.find((d) => d.id === id);
      if (existing) {
        setSelectedDoc(existing);
        return;
      }
      try {
        const page = await pagesApi.get(id);
        const doc = pageToDoc(page, user);
        setDocuments((prev) => (prev.some((d) => d.id === doc.id) ? prev : [...prev, doc]));
        setSelectedDoc(doc);
      } catch (err) {
        toast.error(describeError(err, "Impossible d'ouvrir la page."));
      }
    },
    [documents, user],
  );

  const handleDeleteDocument = async (id: string) => {
    try {
      await pagesApi.remove(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSelectedDoc((prev) => (prev?.id === id ? null : prev));
      toast.success("Page supprimée");
    } catch (err) {
      toast.error(describeError(err, "Suppression impossible."));
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <SidebarV2
        documents={documents}
        loading={loadingDocs}
        canEdit={canEdit}
        onSelectDocument={setSelectedDoc}
        onCreateDocument={handleCreateDocument}
        onDeleteDocument={handleDeleteDocument}
        onImport={canEdit ? () => setImportOpen(true) : undefined}
        selectedDocId={selectedDoc?.id}
      />

      <div className="flex-1 flex flex-col">
        <HeaderV2
          documents={documents}
          onSelectDocument={setSelectedDoc}
          onOpenMap={() => setMapOpen(true)}
          onOpenAnalytics={canSeeAnalytics ? () => setAnalyticsOpen(true) : undefined}
          onOpenAudit={canSeeAudit ? () => setAuditOpen(true) : undefined}
        />

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {loadError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                <p className="text-muted-foreground">{loadError}</p>
                <Button onClick={loadPages} variant="outline">
                  Réessayer
                </Button>
              </div>
            ) : selectedDoc && !selectedDoc.isFolder ? (
              <MarkdownEditorV2
                key={selectedDoc.id}
                document={selectedDoc}
                readOnly={!canEdit}
                onSave={handleSaveDocument}
                onOpenRelated={openDocumentById}
              />
            ) : (
              <DashboardV2 documents={documents} onSelectDocument={setSelectedDoc} />
            )}
          </div>

          {showAIPanel && (
            <AIPanel onClose={() => setShowAIPanel(false)} onOpenSource={openDocumentById} />
          )}
        </div>
      </div>

      {!showAIPanel && (
        <Button
          onClick={() => setShowAIPanel(true)}
          title="Ouvrir Lekki AI"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
        >
          <Bot size={24} />
        </Button>
      )}

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={loadPages}
      />

      <KnowledgeMapDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        onOpenPage={openDocumentById}
      />

      <AnalyticsDashboard
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        onOpenPage={openDocumentById}
      />

      <AuditDashboard
        open={auditOpen}
        onOpenChange={setAuditOpen}
        onOpenPage={openDocumentById}
      />
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  return (
    <WorkspaceProvider>
      <WikiApp />
    </WorkspaceProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AuthGate />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
