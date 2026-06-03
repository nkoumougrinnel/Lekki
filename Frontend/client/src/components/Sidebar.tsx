import { WikiDocument } from '@/types/wiki';
import { ChevronDown, ChevronRight, Folder, FileText, Lock, Globe } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  documents: WikiDocument[];
  onSelectDocument: (doc: WikiDocument) => void;
  selectedDocId?: string;
}

export function Sidebar({ documents, onSelectDocument, selectedDocId }: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['doc-1']));

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const renderDocument = (doc: WikiDocument, level: number = 0) => {
    const isExpanded = expandedFolders.has(doc.id);
    const isSelected = selectedDocId === doc.id;

    return (
      <div key={doc.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
            isSelected
              ? 'bg-emerald-100 text-emerald-900'
              : 'hover:bg-smoke text-foreground'
          }`}
          style={{ marginLeft: `${level * 16}px` }}
        >
          {doc.isFolder ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(doc.id);
                }}
                className="p-0 hover:bg-white rounded"
              >
                {isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
              <Folder size={16} className="text-emerald-600" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <FileText size={16} className="text-sapphire-600" />
            </>
          )}
          <span
            onClick={() => onSelectDocument(doc)}
            className="flex-1 text-sm font-medium truncate"
          >
            {doc.title}
          </span>
          {!doc.access.public && <Lock size={12} className="text-mist" />}
        </div>

        {doc.isFolder && isExpanded && doc.children && (
          <div>
            {doc.children.map((child) => renderDocument(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold">L</span>
          </div>
          <h1 className="text-lg font-bold text-foreground">Lekki</h1>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide px-3 py-2">
            Documents
          </h2>
          {documents.map((doc) => renderDocument(doc))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button variant="outline" className="w-full text-sm">
          + New Document
        </Button>
        <Button variant="ghost" className="w-full text-sm">
          Settings
        </Button>
      </div>
    </div>
  );
}
