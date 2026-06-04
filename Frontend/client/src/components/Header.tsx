import { WikiDocument } from '@/types/wiki';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Search, Moon, Sun, LogOut, FileText, Share2, BarChart3, ShieldCheck, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { pages as pagesApi } from '@/lib/api';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

interface HeaderProps {
  documents: WikiDocument[];
  onSelectDocument: (doc: WikiDocument) => void;
  onOpenMap?: () => void;
  onOpenAnalytics?: () => void;
  onOpenAudit?: () => void;
  onOpenSidebar?: () => void;
}

export function Header({ documents, onSelectDocument, onOpenMap, onOpenAnalytics, onOpenAudit, onOpenSidebar }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WikiDocument[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initials = (user?.username ?? '?')
    .split(/[\s._-]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const found = await pagesApi.search(q);
        if (cancelled) return;
        const byId = new Map(documents.map((d) => [d.id, d]));
        const mapped = found
          .map((p) => byId.get(p.id))
          .filter((d): d is WikiDocument => Boolean(d));
        setResults(mapped);
        setOpen(true);
      } catch {
        if (!cancelled) {
          setResults([]);
          setOpen(false);
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, documents]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectResult = (doc: WikiDocument) => {
    onSelectDocument(doc);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-40">
      <div className="flex items-center px-4 sm:px-6 py-4 gap-2 sm:gap-4">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-1 -ml-1 rounded hover:bg-secondary transition-colors"
          title="Ouvrir le menu"
          aria-label="Ouvrir le menu latéral"
        >
          <Menu size={20} className="text-muted-foreground" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Bouton Workspace */}
        <WorkspaceSwitcher />

        {/* Champ de recherche compact collé */}
        <div ref={containerRef} className="relative w-full max-w-xs">
          <Search
            size={16}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Rechercher une page..."
            className="pl-8 text-sm"
          />

          {open && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-y-auto max-h-80 z-50">
              {results.length > 0 ? (
                results.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => selectResult(doc)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
                  >
                    <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-foreground">{doc.title}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-muted-foreground">Aucun résultat</div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Right - Theme Toggle & User Menu */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {onOpenAnalytics && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenAnalytics}
              className="rounded-lg"
              title="Analytics d'usage"
            >
              <BarChart3 size={18} />
            </Button>
          )}
          {onOpenAudit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenAudit}
              className="rounded-lg"
              title="Audit de connaissance"
            >
              <ShieldCheck size={18} />
            </Button>
          )}
          {onOpenMap && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenMap}
              className="rounded-lg"
              title="Carte des connaissances"
            >
              <Share2 size={18} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="rounded-lg"
            title={`Passer en mode ${theme === 'light' ? 'sombre' : 'clair'}`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </Button>

          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                {initials}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold text-foreground">{user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="flex items-center gap-2 text-destructive"
            >
              <LogOut size={16} />
              <span>Se déconnecter</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        </div>
      </div>
    </header>
  );
}
