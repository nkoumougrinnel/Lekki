import { WikiDocument } from '@/types/wiki';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FilePlus,
  Plus,
  Trash2,
  Loader2,
  Star,
  Upload,
} from 'lucide-react';
import { useState } from 'react';

export type SidebarSection = 'favoris' | 'prives' | 'groupes' | 'publics';

interface SidebarV2Props {
  documents: WikiDocument[];
  loading?: boolean;
  canEdit?: boolean;
  onSelectDocument: (doc: WikiDocument) => void;
  onCreateDocument: (section: 'prives' | 'publics') => void;
  onDeleteDocument?: (id: string) => void;
  onImport?: () => void;
  selectedDocId?: string;
}

const SECTIONS: { key: SidebarSection; label: string; canAdd: boolean }[] = [
  { key: 'favoris', label: 'Favoris', canAdd: false },
  { key: 'prives', label: 'Privés', canAdd: true },
  { key: 'groupes', label: 'Groupes', canAdd: false },
  { key: 'publics', label: 'Publics', canAdd: true },
];

const FAVORITES_KEY = 'lekki_favorites';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function SidebarV2({
  documents,
  loading,
  canEdit,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  onImport,
  selectedDocId,
}: SidebarV2Props) {
  const [collapsed, setCollapsed] = useState<Set<SidebarSection>>(
    () => new Set<SidebarSection>(['groupes']),
  );
  const [hovered, setHovered] = useState<SidebarSection | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  const toggleSection = (section: SidebarSection) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const documentsFor = (section: SidebarSection): WikiDocument[] => {
    switch (section) {
      case 'favoris':
        return documents.filter((d) => favorites.has(d.id));
      case 'prives':
        return documents.filter((d) => !d.access.public);
      case 'publics':
        return documents.filter((d) => d.access.public);
      case 'groupes':
        return [];
    }
  };

  const renderDocument = (doc: WikiDocument) => {
    const isSelected = selectedDocId === doc.id;
    const isFav = favorites.has(doc.id);
    return (
      <div
        key={doc.id}
        className={`group/doc flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
          isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-foreground'
        }`}
        onClick={() => onSelectDocument(doc)}
      >
        <FileText size={16} className="text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-sm font-medium truncate">{doc.title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(doc.id);
          }}
          className={`p-1 rounded hover:bg-background transition-opacity ${
            isFav ? 'opacity-100' : 'opacity-0 group-hover/doc:opacity-100'
          }`}
          title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star
            size={13}
            className={isFav ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}
          />
        </button>
        {canEdit && onDeleteDocument && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Supprimer « ${doc.title} » ?`)) onDeleteDocument(doc.id);
            }}
            className="opacity-0 group-hover/doc:opacity-100 p-1 hover:bg-background rounded transition-opacity"
            title="Supprimer"
          >
            <Trash2 size={13} className="text-muted-foreground" />
          </button>
        )}
      </div>
    );
  };

  const renderSection = ({
    key,
    label,
    canAdd,
  }: {
    key: SidebarSection;
    label: string;
    canAdd: boolean;
  }) => {
    const isCollapsed = collapsed.has(key);
    const docs = documentsFor(key);

    return (
      <div key={key} className="mb-2">
        <div
          className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-secondary rounded-md transition-colors"
          onMouseEnter={() => setHovered(key)}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="flex items-center gap-2 flex-1" onClick={() => toggleSection(key)}>
            {isCollapsed ? (
              <ChevronRight size={14} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={14} className="text-muted-foreground" />
            )}
            {key === 'favoris' && (
              <Star size={13} className="flex-shrink-0 fill-amber-400 text-amber-400" />
            )}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
            <span className="text-xs text-muted-foreground">({docs.length})</span>
          </div>
          {canEdit && canAdd && (key === 'prives' || key === 'publics') && hovered === key && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateDocument(key);
              }}
              className="p-1 hover:bg-background rounded transition-colors"
              title="Nouvelle page"
            >
              <Plus size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <div className="mt-0.5">
            {docs.length > 0 ? (
              docs.map((doc) => renderDocument(doc))
            ) : (
              <div className="px-3 py-1.5 text-xs text-muted-foreground italic">
                {key === 'groupes' ? 'Bientôt disponible' : 'Aucune page'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-background border-r border-border flex flex-col h-screen">
      {/* Brand */}
      <div className="p-4 border-b border-border flex items-center gap-2">
        <img src="/lekki_icon_emerald.svg" alt="Lekki" className="w-8 h-8 rounded-md" />
        <h1 className="text-lg font-bold text-foreground">Lekki</h1>
      </div>

      {/* Toolbar (style VS Code) */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Pages
        </span>
        {canEdit && (
          <div className="flex items-center gap-1">
            {onImport && (
              <button
                onClick={onImport}
                className="p-1 hover:bg-secondary rounded transition-colors"
                title="Importer des documents (PDF, DOCX, TXT, Markdown)"
              >
                <Upload size={16} className="text-muted-foreground" />
              </button>
            )}
            <button
              onClick={() => onCreateDocument('publics')}
              className="p-1 hover:bg-secondary rounded transition-colors"
              title="Nouvelle page"
            >
              <FilePlus size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : (
          SECTIONS.map(renderSection)
        )}
      </div>
    </div>
  );
}
