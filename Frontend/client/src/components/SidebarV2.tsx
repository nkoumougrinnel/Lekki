import { WikiDocument } from '@/types/wiki';
import { ChevronDown, ChevronRight, Folder, FileText, Lock, Globe, Plus, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SidebarV2Props {
  documents: WikiDocument[];
  onSelectDocument: (doc: WikiDocument) => void;
  onCreateDocument: (category: 'favorites' | 'private' | 'groups' | 'public') => void;
  selectedDocId?: string;
}

type Category = 'favorites' | 'private' | 'groups' | 'public';

export function SidebarV2({ documents, onSelectDocument, onCreateDocument, selectedDocId }: SidebarV2Props) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['doc-1']));
  const [expandedCategories, setExpandedCategories] = useState<Set<Category>>(
    new Set(['favorites' as Category, 'private' as Category, 'public' as Category])
  );
  const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null);

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleCategory = (category: Category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const renderDocument = (doc: WikiDocument, level: number = 0) => {
    const isExpanded = expandedFolders.has(doc.id);
    const isSelected = selectedDocId === doc.id;

    return (
      <div key={doc.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
            isSelected
              ? 'bg-primary/20 text-primary'
              : 'hover:bg-secondary text-foreground'
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
                className="p-0 hover:bg-background rounded"
              >
                {isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
              <Folder size={16} className="text-primary" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <FileText size={16} className="text-muted-foreground" />
            </>
          )}
          <span
            onClick={() => onSelectDocument(doc)}
            className="flex-1 text-sm font-medium truncate"
          >
            {doc.title}
          </span>
          {!doc.access.public && <Lock size={12} className="text-muted-foreground" />}
        </div>

        {doc.isFolder && isExpanded && doc.children && (
          <div>
            {doc.children.map((child) => renderDocument(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderCategory = (category: Category, label: string, icon: React.ReactNode) => {
    const isExpanded = expandedCategories.has(category);
    const categoryDocs = documents.filter((doc) => {
      if (category === 'private') return !doc.access.public;
      if (category === 'public') return doc.access.public;
      if (category === 'favorites') return true; // Placeholder
      return false;
    });

    return (
      <div key={category} className="mb-4">
        <div
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-secondary rounded-md transition-colors"
          onMouseEnter={() => setHoveredCategory(category)}
          onMouseLeave={() => setHoveredCategory(null)}
        >
          <div
            className="flex items-center gap-2 flex-1"
            onClick={() => toggleCategory(category)}
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={16} className="text-muted-foreground" />
            )}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
          </div>
          {hoveredCategory === category && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateDocument(category);
              }}
              className="p-1 hover:bg-background rounded transition-colors"
              title="Add document"
            >
              <Plus size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-1">
            {categoryDocs.length > 0 ? (
              categoryDocs.map((doc) => renderDocument(doc, 0))
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground italic">
                No documents
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-background border-r border-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold">L</span>
          </div>
          <h1 className="text-lg font-bold text-foreground">Lekki</h1>
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {renderCategory('favorites', 'Favorites', '⭐')}
        {renderCategory('private', 'Private', '🔒')}
        {renderCategory('groups', 'Groups', '👥')}
        {renderCategory('public', 'Public', '🌐')}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full text-sm"
          onClick={() => onCreateDocument('private')}
        >
          + New Document
        </Button>
      </div>
    </div>
  );
}
