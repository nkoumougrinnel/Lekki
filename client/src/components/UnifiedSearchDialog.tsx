import React, { useEffect, useState, useRef } from "react";
import { searchApi } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { UnifiedSearchResults, WikiStatus } from "@/types/lekki";
import { StudentDocBadge } from "./StudentDocBadge";
import { classifyDocument, prettyName } from "@/lib/studentDocs";
import { DocumentTypeIcon } from "./DocumentTypeIcon";
import {
  Search,
  X,
  FileText,
  BookOpen,
  Share2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface UnifiedSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onSelectDocument: (docId: string) => void;
  onSelectWiki: (wikiId: string) => void;
  onAskAI: (query: string) => void;
  fullScreen?: boolean;
}

export function UnifiedSearchDialog({
  open,
  onOpenChange,
  query,
  onQueryChange,
  onSelectDocument,
  onSelectWiki,
  onAskAI,
  fullScreen = false,
}: UnifiedSearchDialogProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResults>({
    documents: [],
    wiki: [],
    shared: [],
  });

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setResults({ documents: [], wiki: [], shared: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.unified(query.trim(), activeWorkspaceId || undefined);
        setResults({
          documents: Array.isArray(res?.documents) ? res.documents : [],
          wiki: Array.isArray(res?.wiki) ? res.wiki : [],
          shared: Array.isArray(res?.shared) ? res.shared : [],
        });
      } catch {
        setResults({ documents: [], wiki: [], shared: [] });
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, activeWorkspaceId, open]);

  if (!open) return null;

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
      id="unified-search-dropdown"
      className={`${
        fullScreen
          ? "fixed inset-0 z-50 bg-[#0E1116]/97 backdrop-blur-md"
          : "relative sm:absolute sm:left-0 sm:right-0 sm:top-full sm:z-50 sm:mt-2"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        id="unified-search-modal"
        className={`w-full bg-[#14171E] border border-zinc-700/80 ${
          fullScreen
            ? "rounded-none h-full shadow-none"
            : "border-x-0 border-t-0 sm:border sm:rounded-xl sm:shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100"
        } overflow-hidden`}
      >
        {/* Ask Lekki AI prompt banner if query present */}
        {/* « Demander à Lekki » : c'est par ici que l'étudiant ouvre l'IA sur téléphone */}
        {query.trim().length > 0 && (
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onAskAI(query.trim());
            }}
            className="flex w-full items-center gap-3 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left transition hover:bg-emerald-500/15 active:bg-emerald-500/20"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-emerald-200">Demander à Lekki</span>
              <span className="block truncate text-xs text-emerald-300/70">« {query.trim()} »</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-emerald-400" />
          </button>
        )}

        {/* Results Container */}
        <div className="max-h-[calc(100dvh-7.5rem)] overflow-y-auto p-3 space-y-4 sm:max-h-[60vh]">
          {loading && (
            <div className="py-8 text-center text-xs text-zinc-500">
              Recherche dans tes documents et tes fiches…
            </div>
          )}

          {!loading && !query && (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-zinc-400">
                Tape un mot-clé : Lekki cherche à la fois dans les documents et dans les fiches du wiki.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {["OSPF", "TCP", "UDP", "Routage", "Fibre", "Examens"].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => onQueryChange(chip)}
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
                La recherche couvre ton espace personnel et l’espace actif.
              </p>
            </div>
          )}

          {/* DOCUMENTS */}
          {results.documents.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                <FileText className="h-3 w-3 text-emerald-400" />
                <span>Documents ({results.documents.length})</span>
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
                    <div className="mt-0.5"><DocumentTypeIcon extension={doc.extension} className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 truncate sm:text-xs">
                          {prettyName(doc.title)}
                        </span>
                        <StudentDocBadge info={classifyDocument(doc.title)} compact />
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5 sm:line-clamp-1 sm:text-[11px]">
                        {doc.excerpt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WIKI */}
          {results.wiki.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                <BookOpen className="h-3 w-3 text-emerald-400" />
                <span>Fiches du wiki ({results.wiki.length})</span>
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
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5 sm:line-clamp-1 sm:text-[11px]">
                        {page.excerpt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PARTAGES */}
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
                    <div className="mt-0.5"><DocumentTypeIcon extension={doc.extension} className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 truncate sm:text-xs">
                          {prettyName(doc.title)}
                        </span>
                        <span className="text-[11px] text-sky-400 shrink-0">
                          Par {doc.shared_by}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5 sm:line-clamp-1 sm:text-[11px]">
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
          <span>Documents et fiches de ton espace</span>
          <span className="hidden font-mono text-[10px] sm:inline">Échap pour fermer</span>
        </div>
      </div>
    </div>
  );
}
