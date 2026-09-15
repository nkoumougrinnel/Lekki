import React, { useEffect, useState, useRef } from "react";
import { searchApi } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { UnifiedSearchResults, FileExtension, WikiStatus } from "@/types/lekki";
import {
  Search,
  X,
  FileText,
  BookOpen,
  Share2,
  FileSpreadsheet,
  FileCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface UnifiedSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDocument: (docId: string) => void;
  onSelectWiki: (wikiId: string) => void;
  onAskAI: (query: string) => void;
}

export function UnifiedSearchDialog({
  open,
  onOpenChange,
  onSelectDocument,
  onSelectWiki,
  onAskAI,
}: UnifiedSearchDialogProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResults>({
    documents: [],
    wiki: [],
    shared: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ documents: [], wiki: [], shared: [] });
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ documents: [], wiki: [], shared: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.unified(query.trim(), activeWorkspaceId || undefined);
        setResults(res);
      } catch {
        // Safe fallback
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, activeWorkspaceId]);

  if (!open) return null;

  const getDocIcon = (ext: FileExtension) => {
    switch (ext) {
      case "pdf":
        return <FileText className="h-4 w-4 text-rose-400 shrink-0" />;
      case "docx":
        return <FileSpreadsheet className="h-4 w-4 text-sky-400 shrink-0" />;
      case "pptx":
        return <FileText className="h-4 w-4 text-amber-400 shrink-0" />;
      case "md":
      case "txt":
        return <FileCode className="h-4 w-4 text-emerald-400 shrink-0" />;
      default:
        return <FileText className="h-4 w-4 text-zinc-400 shrink-0" />;
    }
  };

  const getStatusBadge = (status: WikiStatus) => {
    switch (status) {
      case "verified":
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            🟢 Vérifiée
          </span>
        );
      case "community":
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
            🔵 Communautaire
          </span>
        );
      case "draft":
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            🟡 Brouillon
          </span>
        );
    }
  };

  const totalResults =
    results.documents.length + results.wiki.length + results.shared.length;

  return (
    <div
      id="unified-search-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        id="unified-search-modal"
        className="w-full max-w-2xl bg-[#14171E] border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Search Input Bar */}
        <div className="p-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/60">
          <Search className="h-5 w-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher dans tout Lekki (documents, wiki, partages)..."
            className="flex-1 bg-transparent border-none text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          >
            Échap
          </button>
        </div>

        {/* Ask Lekki AI prompt banner if query present */}
        {query.trim().length > 2 && (
          <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Interroger Lekki AI sur « {query} »</span>
            </div>
            <button
              onClick={() => {
                onOpenChange(false);
                onAskAI(query);
              }}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
            >
              Poser la question <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Results Container (Section 15: Partitioned by DOCUMENTS, WIKI, PARTAGES) */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {loading && (
            <div className="py-8 text-center text-xs text-zinc-500">
              Recherche unifiée dans votre périmètre accessible...
            </div>
          )}

          {!loading && !query && (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-zinc-400">
                Tapez un mot-clé pour explorer simultanément vos documents originaux et vos fiches Wiki.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {["OSPF", "TCP", "UDP", "Routage", "Fibre", "Examens"].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setQuery(chip)}
                    className="text-[11px] px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="py-8 text-center text-xs text-zinc-400 space-y-1">
              <p>Aucun document ou page Wiki trouvé pour « {query} ».</p>
              <p className="text-[11px] text-zinc-500">
                Vérifiez que le contenu appartient à votre espace personnel ou à votre Workspace actif.
              </p>
            </div>
          )}

          {/* Section 15 Result Block: DOCUMENTS */}
          {results.documents.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                <FileText className="h-3 w-3 text-emerald-400" />
                <span>Documents originaux ({results.documents.length})</span>
              </div>
              <div className="space-y-1">
                {results.documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      onOpenChange(false);
                      onSelectDocument(doc.id);
                    }}
                    className="w-full text-left p-2.5 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-start gap-2.5 group"
                  >
                    <div className="mt-0.5">{getDocIcon(doc.extension)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-200 group-hover:text-emerald-400 truncate">
                          {doc.title}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {doc.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {doc.excerpt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 15 Result Block: WIKI */}
          {results.wiki.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                <BookOpen className="h-3 w-3 text-emerald-400" />
                <span>Mémoire collective — Wiki ({results.wiki.length})</span>
              </div>
              <div className="space-y-1">
                {results.wiki.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      onOpenChange(false);
                      onSelectWiki(page.id);
                    }}
                    className="w-full text-left p-2.5 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-start gap-2.5 group"
                  >
                    <BookOpen className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-200 group-hover:text-emerald-400 truncate">
                          {page.title}
                        </span>
                        {getStatusBadge(page.status)}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {page.excerpt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 15 Result Block: PARTAGES */}
          {results.shared.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                <Share2 className="h-3 w-3 text-sky-400" />
                <span>Partagés avec moi ({results.shared.length})</span>
              </div>
              <div className="space-y-1">
                {results.shared.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      onOpenChange(false);
                      onSelectDocument(doc.id);
                    }}
                    className="w-full text-left p-2.5 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-start gap-2.5 group"
                  >
                    <div className="mt-0.5">{getDocIcon(doc.extension)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-200 group-hover:text-emerald-400 truncate">
                          {doc.title}
                        </span>
                        <span className="text-[10px] font-mono text-sky-400 shrink-0">
                          Par {doc.shared_by}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {doc.excerpt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-zinc-950/60 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>Navigation unifiée sans barrière entre Drive & Wiki</span>
          <span className="font-mono text-[10px]">Lekki Search Engine</span>
        </div>
      </div>
    </div>
  );
}
