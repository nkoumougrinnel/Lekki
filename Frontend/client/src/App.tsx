import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useCallback, useEffect, useState } from "react";
import { SidebarV2 } from "./components/SidebarV2";
import { HeaderV2 } from "./components/HeaderV2";
import { DashboardV2 } from "./components/DashboardV2";
import { MarkdownEditorV2 } from "./components/MarkdownEditorV2";
import { AIPanel } from "./components/AIPanel";
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
  const [selectedDoc, setSelectedDoc] = useState<WikiDocument | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [documents, setDocuments] = useState<WikiDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canEdit = user?.role === "admin" || user?.role === "editor";

  const loadPages = useCallback(async () => {
    setLoadingDocs(true);
    setLoadError(null);
    try {
      const list = await pagesApi.list({ limit: 100 });
      setDocuments(list.map((p) => pageToDoc(p, user)));
    } catch (err) {
      setLoadError(describeError(err, "Impossible de charger les pages."));
    } finally {
      setLoadingDocs(false);
    }
  }, [user]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleCreateDocument = async (section: "prives" | "publics") => {
    try {
      const page = await pagesApi.create({
        title: "Nouvelle page",
        content: "# Nouvelle page\n\n",
        category: "guides",
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
        selectedDocId={selectedDoc?.id}
      />

      <div className="flex-1 flex flex-col">
        <HeaderV2 documents={documents} onSelectDocument={setSelectedDoc} />

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
              />
            ) : (
              <DashboardV2 documents={documents} onSelectDocument={setSelectedDoc} />
            )}
          </div>

          {showAIPanel && <AIPanel onClose={() => setShowAIPanel(false)} />}
        </div>
      </div>

      {!showAIPanel && (
        <Button
          onClick={() => setShowAIPanel(true)}
          title="Ouvrir l'assistant IA"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
        >
          <Bot size={24} />
        </Button>
      )}
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
  return <WikiApp />;
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
