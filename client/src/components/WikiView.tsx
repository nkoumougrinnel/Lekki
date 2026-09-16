import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { WikiHeaderBar } from "./WikiHeaderBar";

interface WikiViewProps {
  pages: WikiPage[];
  availableFiles: DriveFile[];
  activeWorkspaceName?: string;
  onSelectPage: (page: WikiPage) => void;
  onNewPageClick: (defaultTopic?: string, defaultSection?: string) => void;
  filterTopic?: string | null;
  onClearFilter?: () => void;
  onNavigateToTopic?: (topic: string) => void;
}

export function WikiView({
  pages,
  activeWorkspaceName,
  onSelectPage,
  onNewPageClick,
  filterTopic,
  onClearFilter,
  onNavigateToTopic,
}: WikiViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Group pages dynamically: Topic -> Section -> Pages
  const tree = useMemo(() => {
    const map = new Map<string, Map<string, WikiPage[]>>();

    pages.forEach((p) => {
      const topicName = p.topic || "Général";

      // Filter by topic if requested
      if (filterTopic && topicName !== filterTopic) return;

      const sectionName = p.section || "Autres";

      if (!map.has(topicName)) {
        map.set(topicName, new Map<string, WikiPage[]>());
      }

      const topicMap = map.get(topicName)!;
      if (!topicMap.has(sectionName)) {
        topicMap.set(sectionName, []);
      }

      topicMap.get(sectionName)!.push(p);
    });

    return map;
  }, [pages, filterTopic]);

  // Search filtered pages
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

  // Helper for status badge
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

  return (
    <div id="wiki-home-view" className="flex-1 flex flex-col min-w-0 bg-[#0E1116] overflow-y-auto">
      {/* HEADER */}
      <WikiHeaderBar>
          <div className="flex items-center min-w-0">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-zinc-100 truncate">
                  Wiki d'équipe
                </h1>
                {filterTopic && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-zinc-600 text-sm">›</span>
                    <span className="text-sm font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                      {filterTopic}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

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
            <button
              onClick={() => onNewPageClick()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Nouvelle page</span>
            </button>
          </div>
      </WikiHeaderBar>

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl w-full mx-auto p-6 sm:p-8">
        {searchResults !== null ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">
                Résultats de recherche ({searchResults.length})
              </h2>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-emerald-400 hover:underline"
              >
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
        ) : (
          <>
            {filterTopic ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from(tree.get(filterTopic)?.entries() || []).map(([sectionName, secPages]) => (
                  <div key={sectionName} className="break-inside-avoid rounded-xl border border-zinc-800/60 bg-[#12151B] overflow-hidden shadow-sm hover:border-zinc-700/60 transition-colors">
                    {/* Section Header as Topic Header */}
                    <div className="px-5 py-4 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center justify-between">
                      <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-emerald-400" />
                        {sectionName}
                      </h2>
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">
                        {secPages.length}
                      </span>
                    </div>

                    {/* Pages List */}
                    <div className="p-4 space-y-1.5">
                      {secPages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() => onSelectPage(page)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/60 flex items-start gap-3 group transition-all hover:translate-x-1"
                        >
                          <span className="text-zinc-600 group-hover:text-emerald-400 shrink-0 text-sm leading-tight transition-colors">
                            📖
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 truncate transition-colors leading-tight">
                              {page.title}
                            </div>
                          </div>
                          {renderStatusBadge(page)}
                        </button>
                      ))}

                      {/* Inline Add button for this section */}
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
            ) : (
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {Array.from(tree.entries()).map(([topicName, sectionsMap]) => {
                  let totalPages = 0;
                  sectionsMap.forEach(pages => { totalPages += pages.length; });

                  return (
                    <div key={topicName} className="break-inside-avoid rounded-xl border border-zinc-800/60 bg-[#12151B] overflow-hidden shadow-sm hover:border-zinc-700/60 transition-colors">
                      <div className="px-5 py-4 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center justify-between group cursor-pointer hover:bg-zinc-800/60 transition-colors"
                           onClick={() => onNavigateToTopic?.(topicName)}>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                            <FolderTree className="h-4 w-4" />
                          </div>
                          <h2 className="text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                            {topicName}
                          </h2>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">
                          {totalPages}
                        </span>
                      </div>

                      <div className="p-4 space-y-6">
                        {Array.from(sectionsMap.entries()).map(([sectionName, secPages]) => (
                          <div key={sectionName} className="space-y-2">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 px-2 flex items-center gap-2">
                              <span className="h-px w-3 bg-zinc-800" />
                              {sectionName}
                            </h3>
                            <div className="grid grid-cols-1 gap-1.5 pl-2">
                              {secPages.map((page) => (
                                <button
                                  key={page.id}
                                  onClick={() => onSelectPage(page)}
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/60 flex items-start gap-3 group transition-all hover:translate-x-1"
                                >
                                  <span className="text-zinc-600 group-hover:text-emerald-400 shrink-0 text-sm leading-tight transition-colors">
                                    📖
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 truncate transition-colors leading-tight">
                                      {page.title}
                                    </div>
                                  </div>
                                  {renderStatusBadge(page)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}

                        <div className="pt-2 px-2">
                          <button
                            onClick={() => onNewPageClick(topicName)}
                            className="text-[11px] font-medium text-zinc-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            Ajouter dans {topicName}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
