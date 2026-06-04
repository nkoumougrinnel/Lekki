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
import { Search, Moon, Sun, LogOut, FileText, Share2, BarChart3, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { pages as pagesApi } from '@/lib/api';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

interface HeaderV2Props {
  documents: WikiDocument[];
  onSelectDocument: (doc: WikiDocument) => void;
  onOpenMap?: () => void;
  onOpenAnalytics?: () => void;
  onOpenAudit?: () => void;
}

export function HeaderV2({ documents, onSelectDocument, onOpenMap, onOpenAnalytics, onOpenAudit }: HeaderV2Props) {
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
      <div className="flex items-center px-6 py-4 gap-4">
        <div className="flex-1 flex items-center">
          <WorkspaceSwitcher />
        </div>

        {/* Center - Search Bar */}
        <div ref={containerRef} className="relative w-full max-w-md">
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
            <Search size={16} className="text-muted-foreground flex-shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Rechercher une page..."
              className="bg-transparent border-0 focus:ring-0 text-sm"
            />
          </div>

          {open && (
            <div className="absolute left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
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
              <Button variant="ghost" size="sm" className="rounded-full">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
              </Button>
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
