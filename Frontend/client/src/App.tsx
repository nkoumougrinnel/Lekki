import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useState } from "react";
import { SidebarV2 } from "./components/SidebarV2";
import { HeaderV2 } from "./components/HeaderV2";
import { DashboardV2 } from "./components/DashboardV2";
import { MarkdownEditorV2 } from "./components/MarkdownEditorV2";
import { AIPanel } from "./components/AIPanel";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { mockDocuments, mockUser, mockStats } from "./lib/mockData";
import { WikiDocument } from "./types/wiki";

function App() {
  const [selectedDoc, setSelectedDoc] = useState<WikiDocument | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [documentCounter, setDocumentCounter] = useState(0);
  const [allDocuments, setAllDocuments] = useState(mockDocuments);

  const handleCreateDocument = (category: 'favorites' | 'private' | 'groups' | 'public') => {
    const newDoc: WikiDocument = {
      id: `untitled-${documentCounter}`,
      title: `Untitled ${documentCounter}`,
      content: '',
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: mockUser.name,
      tags: [],
      access: {
        public: category === 'public',
        users: [],
        groups: [],
      },
      isFolder: false,
    };

    setAllDocuments((prev) => [...prev, newDoc]);
    setSelectedDoc(newDoc);
    setDocumentCounter((prev) => prev + 1);
  };

  const handleSaveDocument = (content: string) => {
    if (selectedDoc) {
      const updatedDoc = {
        ...selectedDoc,
        content,
        updatedAt: new Date(),
      };
      setSelectedDoc(updatedDoc);
      setAllDocuments((prev) =>
        prev.map((doc) => (doc.id === selectedDoc.id ? updatedDoc : doc))
      );
    }
  };

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <SidebarV2
              documents={allDocuments}
              onSelectDocument={setSelectedDoc}
              onCreateDocument={handleCreateDocument}
              selectedDocId={selectedDoc?.id}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              <HeaderV2
                user={mockUser}
                onLogout={() => console.log('Logout')}
              />

              <div className="flex flex-1 overflow-hidden">
                {/* Editor or Dashboard */}
                <div className="flex-1 overflow-hidden">
                  {selectedDoc && !selectedDoc.isFolder ? (
                    <MarkdownEditorV2
                      key={selectedDoc.id}
                      document={selectedDoc}
                      onSave={handleSaveDocument}
                    />
                  ) : (
                    <DashboardV2
                      stats={mockStats}
                      onSelectDocument={setSelectedDoc}
                    />
                  )}
                </div>

                {/* AI Panel */}
                {showAIPanel && (
                  <AIPanel
                    documents={allDocuments}
                    onClose={() => setShowAIPanel(false)}
                  />
                )}
              </div>
            </div>

            {/* Bouton flottant pour rouvrir l'IA quand le panneau est fermé */}
            {!showAIPanel && (
              <Button
                onClick={() => setShowAIPanel(true)}
                title="Ouvrir l'assistant IA"
                className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              >
                <Sparkles size={24} />
              </Button>
            )}
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
