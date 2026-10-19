import React, { useState, useMemo, useRef, useEffect } from "react";
import { WikiPage, DriveFile } from "@/types/lekki";
import {
  BookOpen,
  Plus,
  Search,
  FolderTree,
  ChevronRight,
  Clock,
  CheckCircle2,
  Users,
  Trash2,
  LayoutGrid,
  FileText,
  Lightbulb,
} from "lucide-react";
import { WikiHeaderBar } from "./WikiHeaderBar";
import { WikiBreadcrumbs } from "./WikiBreadcrumbs";

interface WikiViewProps {
  pages: WikiPage[];
  availableFiles: DriveFile[];
  canManageWiki?: boolean;
  onSelectPage: (page: WikiPage) => void;
  onNewPageClick: (defaultTopic?: string, defaultSection?: string, kind?: "page" | "organization") => void;
  onDeleteSection?: (topic: string, section: string, pageCount: number) => void;
  filterTopic?: string | null;
  onClearFilter?: () => void;
  onNavigateToTopic?: (topic: string) => void;
}

export function WikiView({
  pages,
  canManageWiki = false,
  onSelectPage,
  onNewPageClick,
  onDeleteSection,
  filterTopic,
  onClearFilter,
  onNavigateToTopic,
}: WikiViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [showWikiGuide, setShowWikiGuide] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const tree = useMemo(() => {
    const map = new Map<string, Map<string, WikiPage[]>>();
    pages.forEach((p) => {
      const topicName = p.topic || "Général";
      if (filterTopic && topicName !== filterTopic) return;
      const sectionName = p.section || "Autres";
      if (!map.has(topicName)) map.set(topicName, new Map<string, WikiPage[]>());
      const topicMap = map.get(topicName)!;
      if (!topicMap.has(sectionName)) topicMap.set(sectionName, []);
      topicMap.get(sectionName)!.push(p);
    });
    return map;
  }, [pages, filterTopic]);

  const topics = useMemo(() => {
    const map = new Map<string, number>();
    pages.forEach((p) => {
      const t = p.topic || "Général";
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [pages]);

  const recentPages = useMemo(() => {
    return [...pages]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 6);
  }, [pages]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.topic && p.topic.toLowerCase().includes(q)) ||
        (p.section && p.section.toLowerCase().includes(q)) ||
        p.content.toLowerCase().includes(q)
    );
  }, [pages, searchQuery]);

  const renderStatusBadge = (page: WikiPage) => {
    if (page.status === "verified") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 shrink-0" title="Contenu vérifié">
          <CheckCircle2 className="h-3 w-3" />
        </span>
      );
    }
    if (page.status === "community") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/25 shrink-0" title="Contenu communautaire">
          <Users className="h-3 w-3" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25 shrink-0" title="Brouillon">
        <Clock className="h-3 w-3" />
      </span>
    );
  };

  const formatUpdatedAt = (value?: string) => {
    if (!value) return "Date inconnue";
    const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
    if (Number.isNaN(date.getTime())) return "Date inconnue";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const isEmptyWiki = pages.length === 0;

  return (
    <div id="wiki-home-view" className="flex-1 flex flex-col min-w-0 bg-[#0E1116] overflow-y-auto">
      <WikiHeaderBar>
        <WikiBreadcrumbs
          items={filterTopic ? [{ label: filterTopic }] : []}
          onRootClick={() => onClearFilter?.()}
        />

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="h-4 w-4 text-zinc-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans le wiki..."
              className="w-full pl-10 pr-4 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Effacer
              </button>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setCreateMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Nouvelle page</span>
            </button>
            {createMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#161A22] border border-zinc-700/80 shadow-2xl py-2 z-30 overflow-hidden">
                <button
                  onClick={() => {
                    setCreateMenuOpen(false);
                    onNewPageClick(filterTopic || undefined, undefined, "page");
                  }}
                  className="w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-zinc-800 transition-colors"
                >
                  <FileText className="h-4 w-4 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Page</div>
                    <div className="text-[10px] text-zinc-500">Documenter une connaissance</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setCreateMenuOpen(false);
                    onNewPageClick(filterTopic || undefined, undefined, "organization");
                  }}
                  className="w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-zinc-800 transition-colors"
                >
                  <LayoutGrid className="h-4 w-4 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Page d'organisation</div>
                    <div className="text-[10px] text-zinc-500">Regrouper plusieurs pages</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </WikiHeaderBar>

      <div className="max-w-7xl w-full mx-auto p-6 sm:p-8">
        {searchResults !== null ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">
                Résultats de recherche ({searchResults.length})
              </h2>
              <button onClick={() => setSearchQuery("")} className="text-xs text-emerald-400 hover:underline">
                Retour à l'index
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 text-xs text-zinc-400">
                Aucune page ne correspond à « {searchQuery} ».
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-[#12151B] overflow-hidden">
                {searchResults.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => onSelectPage(page)}
                    className="p-4 hover:bg-zinc-800/40 cursor-pointer flex items-center justify-between gap-3 group transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 group-hover:text-emerald-400">📖</span>
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-emerald-300">
                          {page.title}
                        </span>
                        {renderStatusBadge(page)}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1.5 flex items-center gap-2">
                        <span>{page.topic || "Général"}</span>
                        <span>›</span>
                        <span>{page.section || "Autres"}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : isEmptyWiki ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <BookOpen className="h-10 w-10" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-xl font-bold text-zinc-100">Construisez les connaissances de votre équipe.</h2>
              <p className="text-sm text-zinc-400">
                Créez votre première page pour partager une notion, documenter une procédure ou conserver une connaissance utile à toute l'équipe.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onNewPageClick()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors"
              >
                Créer une première page
              </button>
              <button
                onClick={() => setShowWikiGuide((visible) => !visible)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {showWikiGuide ? "Masquer le guide" : "Découvrir comment organiser le wiki"}
              </button>
            </div>
            {showWikiGuide && (
              <div className="max-w-lg rounded-xl border border-zinc-800 bg-[#12151B] p-4 text-left">
                <div className="flex items-start gap-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Les fichiers conservent les ressources de l’équipe. Le wiki sert à en tirer des connaissances durables : classez chaque page par pôle et section, puis reliez-la aux autres pages et documents utiles.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : filterTopic ? (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">Base de connaissances</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">{filterTopic}</h1>
                <p className="mt-1 text-sm text-zinc-500">Parcourez les pages de cette catégorie ou ajoutez une nouvelle connaissance.</p>
              </div>
              <button
                onClick={() => onNewPageClick(filterTopic)}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-emerald-500/40 hover:bg-zinc-800"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-400" /> Nouvelle page
              </button>
            </div>
            {Array.from(tree.get(filterTopic)?.entries() || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/20 px-6 py-12 text-center">
                <FolderTree className="mx-auto h-8 w-8 text-zinc-600" />
                <h2 className="mt-3 text-sm font-semibold text-zinc-200">Aucune page dans cette catégorie pour le moment.</h2>
                <button onClick={() => onNewPageClick(filterTopic)} className="mt-4 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                  Créer la première page
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from(tree.get(filterTopic)?.entries() || []).map(([sectionName, secPages]) => (
              <div key={sectionName} className="break-inside-avoid rounded-xl border border-zinc-800/60 bg-[#12151B] overflow-hidden shadow-sm hover:border-zinc-700/60 transition-colors">
                <div className="px-5 py-4 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center justify-between">
                  <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-emerald-400" />
                    {sectionName}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">
                      {secPages.length}
                    </span>
                    {canManageWiki && (
                      <button
                        type="button"
                        onClick={() => onDeleteSection?.(filterTopic, sectionName, secPages.length)}
                        aria-label={`Supprimer la section ${sectionName}`}
                        title="Supprimer la section et toutes ses pages"
                        className="rounded-lg p-2 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-1.5">
                  {secPages.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500">Aucune page dans cette catégorie pour le moment.</div>
                  ) : (
                    secPages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => onSelectPage(page)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/60 flex items-start gap-3 group transition-all hover:translate-x-1"
                      >
                        <span className="text-zinc-600 group-hover:text-emerald-400 shrink-0 text-sm leading-tight transition-colors">📖</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 truncate transition-colors leading-tight">
                            {page.title}
                          </div>
                        </div>
                        {renderStatusBadge(page)}
                      </button>
                    ))
                  )}
                  <div className="pt-3 px-2">
                    <button
                      onClick={() => onNewPageClick(filterTopic, sectionName)}
                      className="text-[11px] font-medium text-zinc-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Ajouter dans {sectionName}
                    </button>
                  </div>
                </div>
              </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {topics.map((t) => (
                <button
                  key={t.name}
                  onClick={() => onNavigateToTopic?.(t.name)}
                  className="text-left rounded-xl border border-zinc-800/60 bg-[#12151B] p-5 hover:border-emerald-500/40 hover:bg-zinc-800/40 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                      <FolderTree className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-mono text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">
                      {t.count} page{t.count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                    {t.name}
                  </h3>
                  <div className="text-xs text-zinc-500 mt-1">Ouvrir →</div>
                </button>
              ))}
            </div>

            <div className="max-w-4xl">
              <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#12151B] shadow-lg shadow-black/10">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-800/70 px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-100">Dernières modifications</h2>
                      <p className="mt-0.5 text-[11px] text-zinc-500">Les pages récemment mises à jour</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-[10px] font-medium text-zinc-400">
                    {recentPages.length} {recentPages.length === 1 ? "page" : "pages"}
                  </span>
                </div>
                <div className="divide-y divide-zinc-800/60">
                  {recentPages.map((p) => {
                    const editorName = p.last_editor_name || p.author_name || p.creator_name || "Membre";
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectPage(p)}
                        className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-emerald-500/[0.035] sm:gap-4 sm:px-5"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/[0.07] text-sm font-semibold text-emerald-300 transition-colors group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10">
                          {(editorName.trim().charAt(0) || "M").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium text-zinc-200 transition-colors group-hover:text-emerald-300">{p.title}</span>
                            {renderStatusBadge(p)}
                          </div>
                          <p className="mt-1 truncate text-[11px] text-zinc-500">
                            {p.topic || "Général"}<span className="mx-1.5 text-zinc-700">·</span>{p.section || "Autres"}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-500">
                            Modifiée par <span className="text-zinc-400">{editorName}</span>
                          </p>
                        </div>
                        <div className="hidden shrink-0 text-right sm:block">
                          <p className="text-[11px] font-medium text-zinc-400">{formatUpdatedAt(p.updated_at)}</p>
                          {p.current_version && <p className="mt-1 font-mono text-[10px] text-zinc-600">v{p.current_version}</p>}
                        </div>
                        <div className="shrink-0 text-right sm:hidden">
                          <p className="text-[10px] text-zinc-400">{formatUpdatedAt(p.updated_at)}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WikiView;
