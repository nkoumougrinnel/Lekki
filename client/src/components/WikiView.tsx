import React, { useState, useMemo } from "react";
import { WikiPage, DriveFile } from "@/types/lekki";
import {
  BookOpen,
  Plus,
  Search,
  ArrowRight,
  Radio,
  Wifi,
  Shield,
  Laptop,
  CheckCircle2,
  Users,
  Clock,
  FileText,
  Layers,
  Sparkles,
  FolderTree,
  ChevronRight,
  ArrowLeft,
  Tag,
} from "lucide-react";

interface WikiViewProps {
  pages: WikiPage[];
  availableFiles: DriveFile[];
  activeWorkspaceName?: string;
  onSelectPage: (page: WikiPage) => void;
  onNewPageClick: (defaultTopic?: string, defaultSection?: string) => void;
}

// Preset metadata for known topics with distinct icons and summaries
const TOPIC_CONFIGS: Record<
  string,
  {
    icon: typeof Radio;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
    keywords: string;
  }
> = {
  Réseaux: {
    icon: Radio,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30 group-hover:border-emerald-500/60",
    description: "Connaissances relatives aux réseaux informatiques, protocoles et interconnexion.",
    keywords: "Routage, TCP/IP, VLAN, OSPF, BGP, STP, Protocoles...",
  },
  Télécoms: {
    icon: Wifi,
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30 group-hover:border-sky-500/60",
    description: "Supports de transmission, faisceaux hertziens, fibre optique et réseaux mobiles.",
    keywords: "Transmission, fibre optique, modulation QAM, 4G, 5G SA/NSA...",
  },
  Cybersécurité: {
    icon: Shield,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30 group-hover:border-amber-500/60",
    description: "Protection des systèmes, sécurité périmétrique, cryptographie et détection.",
    keywords: "Cryptographie, pare-feu, VPN IPsec, TLS, sécurité réseau...",
  },
  Informatique: {
    icon: Laptop,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30 group-hover:border-indigo-500/60",
    description: "Systèmes d'exploitation, programmation, administration et infrastructures logicielles.",
    keywords: "Administration Linux, Shell, développement, bases de données...",
  },
};

export function WikiView({
  pages,
  availableFiles,
  activeWorkspaceName,
  onSelectPage,
  onNewPageClick,
}: WikiViewProps) {
  // Current view state: null = Wiki Home (Explorer), string = In a specific topic (e.g. "Réseaux")
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Group pages by Topic
  const topicsMap = useMemo(() => {
    const map = new Map<string, WikiPage[]>();
    // Default ensure core topics exist
    ["Réseaux", "Télécoms", "Cybersécurité", "Informatique"].forEach((t) => {
      map.set(t, []);
    });

    pages.forEach((p) => {
      const topic = p.topic || "Réseaux";
      if (!map.has(topic)) {
        map.set(topic, []);
      }
      map.get(topic)!.push(p);
    });

    return map;
  }, [pages]);

  // List of all active topics
  const topicsList = useMemo(() => {
    return Array.from(topicsMap.entries()).map(([name, topicPages]) => {
      const config = TOPIC_CONFIGS[name] || {
        icon: FolderTree,
        color: "text-teal-400",
        bgColor: "bg-teal-500/10",
        borderColor: "border-teal-500/30 group-hover:border-teal-500/60",
        description: `Espace thématique dédié à ${name}.`,
        keywords: "Synthèses, cours et retours d'expérience...",
      };
      return {
        name,
        count: topicPages.length,
        pages: topicPages,
        ...config,
      };
    });
  }, [topicsMap]);

  // Recently added pages (sorted by created_at desc)
  const recentlyAdded = useMemo(() => {
    return [...pages]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);
  }, [pages]);

  // Recently modified pages (sorted by updated_at desc)
  const recentlyModified = useMemo(() => {
    return [...pages]
      .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
      .slice(0, 5);
  }, [pages]);

  // Search filtered pages (if user typed in search box)
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
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
          <CheckCircle2 className="h-3 w-3" />
          <span>Vérifiée</span>
        </span>
      );
    }
    if (page.status === "community") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/25">
          <Users className="h-3 w-3" />
          <span>Communautaire</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
        <Clock className="h-3 w-3" />
        <span>Brouillon</span>
      </span>
    );
  };

  // Helper to get formatted relative date
  const getRelativeDate = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays === 0) return "Aujourd'hui";
      if (diffDays === 1) return "Hier";
      if (diffDays < 7) return `Il y a ${diffDays} jours`;
      if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
      return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: INSIDE A TOPIC (e.g. "Réseaux")
  // ──────────────────────────────────────────────────────────────────────────
  if (selectedTopic) {
    const topicPages = topicsMap.get(selectedTopic) || [];
    const config = TOPIC_CONFIGS[selectedTopic] || {
      icon: FolderTree,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      description: `Espace de connaissances dédié à ${selectedTopic}.`,
      keywords: "",
    };
    const TopicIcon = config.icon;

    // Group topic pages by section
    const sectionsMap = new Map<string, WikiPage[]>();
    topicPages.forEach((p) => {
      const sec = p.section || "Général";
      if (!sectionsMap.has(sec)) sectionsMap.set(sec, []);
      sectionsMap.get(sec)!.push(p);
    });

    return (
      <div id="wiki-topic-view" className="flex-1 flex flex-col min-w-0 bg-[#0E1116] overflow-y-auto">
        {/* Breadcrumb & Actions Bar */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 bg-[#12151B]/80 sticky top-0 z-10 backdrop-blur-md">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <button
                onClick={() => setSelectedTopic(null)}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1 text-zinc-300 font-medium"
              >
                <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                <span>Wiki</span>
              </button>
              <ChevronRight className="h-3 w-3 text-zinc-600" />
              <span className="text-zinc-100 font-semibold">{selectedTopic}</span>
            </div>

            {/* Topic Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTopic(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Toutes les thématiques</span>
              </button>
              <button
                onClick={() => onNewPageClick(selectedTopic)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Ajouter dans {selectedTopic}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Topic Header & Sections */}
        <div className="max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-8">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-[#131720] border border-zinc-800/80 shadow-sm flex items-start gap-4">
            <div className={`p-3 rounded-xl ${config.bgColor} ${config.color} shrink-0`}>
              <TopicIcon className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                  {selectedTopic}
                </h1>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                  {topicPages.length} page{topicPages.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          {/* Hierarchical Sections list */}
          {sectionsMap.size === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 space-y-3">
              <BookOpen className="h-8 w-8 mx-auto text-zinc-600" />
              <div className="text-sm font-medium text-zinc-300">
                Aucune page rédigée dans {selectedTopic}
              </div>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Commencez à structurer les connaissances en ajoutant une première page fondamentale.
              </p>
              <button
                onClick={() => onNewPageClick(selectedTopic)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Créer une page
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(sectionsMap.entries()).map(([sectionName, secPages]) => (
                <div
                  key={sectionName}
                  className="rounded-xl border border-zinc-800/80 bg-[#12151B] overflow-hidden shadow-sm"
                >
                  {/* Section Title Header */}
                  <div className="px-5 py-3.5 bg-zinc-900/50 border-b border-zinc-800/70 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-sm font-semibold text-zinc-100 tracking-wide">
                        {sectionName}
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {secPages.length} page{secPages.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Section Pages List */}
                  <div className="divide-y divide-zinc-800/60">
                    {secPages.map((page) => {
                      const linkedDocsCount = (page.related_document_ids || []).length;
                      const relatedWikiCount = (page.related_wiki_ids || []).length;

                      return (
                        <div
                          key={page.id}
                          onClick={() => onSelectPage(page)}
                          className="px-5 py-3.5 hover:bg-zinc-800/40 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="text-zinc-500 group-hover:text-emerald-400 mt-0.5 text-base transition-colors shrink-0">
                              📖
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-zinc-200 group-hover:text-emerald-300 transition-colors">
                                  {page.title}
                                </span>
                                {renderStatusBadge(page)}
                              </div>
                              <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                                {page.content.replace(/[#*`_]/g, "").slice(0, 120)}...
                              </p>
                            </div>
                          </div>

                          {/* Meta pill badges */}
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 shrink-0 self-start sm:self-auto pl-7 sm:pl-0">
                            {relatedWikiCount > 0 && (
                              <span
                                title="Pages connexes reliées"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]"
                              >
                                <span>🔗 {relatedWikiCount}</span>
                              </span>
                            )}

                            {linkedDocsCount > 0 && (
                              <span
                                title="Documents sources Drive associés"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 text-[10px]"
                              >
                                <FileText className="h-2.5 w-2.5" />
                                <span>{linkedDocsCount} doc{linkedDocsCount > 1 ? "s" : ""}</span>
                              </span>
                            )}

                            <span className="text-zinc-400 text-xs">
                              {getRelativeDate(page.updated_at)}
                            </span>

                            <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: WIKI HOME (Explorer + Récents)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div id="wiki-home-view" className="flex-1 flex flex-col min-w-0 bg-[#0E1116] overflow-y-auto">
      {/* 1. Header Sobre */}
      <div className="p-6 sm:p-8 border-b border-zinc-800/80 bg-[#12151B]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-6 w-6 text-emerald-400" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                Wiki — {activeWorkspaceName || "SUP'PTIC 3A IR"}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
              La connaissance collective et structurée de l'espace. Explorez par pôles
              intellectuels, découvrez les synthèses rédigées et interrogez-les avec Lekki AI.
            </p>
          </div>

          <button
            onClick={() => onNewPageClick()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm self-start sm:self-auto shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Nouvelle page</span>
          </button>
        </div>

        {/* Quick Search Bar */}
        <div className="max-w-5xl mx-auto mt-6">
          <div className="relative w-full">
            <Search className="h-4 w-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une notion, un protocole, une formule dans le Wiki..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-10">
        {/* If searching, display search results directly */}
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
                Retour à l'exploration
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-8 text-center border border-zinc-800 rounded-xl bg-zinc-900/20 text-xs text-zinc-400">
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
                      <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-2">
                        <span>Thème : {page.topic || "Réseaux"}</span>
                        <span>•</span>
                        <span>Section : {page.section || "Général"}</span>
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
            {/* 2. SECTION EXPLORER (Thematic Knowledge Spaces) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                    📚 EXPLORER
                  </span>
                  <span className="text-xs text-zinc-500">
                    — Pôles de connaissances thématiques
                  </span>
                </div>
              </div>

              {/* Grid of Topic Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {topicsList.map((topic) => {
                  const TopicIcon = topic.icon;

                  return (
                    <div
                      key={topic.name}
                      onClick={() => setSelectedTopic(topic.name)}
                      className={`p-5 rounded-2xl bg-[#12151B] hover:bg-zinc-900 border ${topic.borderColor} transition-all cursor-pointer flex flex-col justify-between group shadow-sm`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className={`p-2.5 rounded-xl ${topic.bgColor} ${topic.color}`}>
                            <TopicIcon className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-full">
                            {topic.count} page{topic.count > 1 ? "s" : ""}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                            <span>{topic.name}</span>
                            <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-emerald-400" />
                          </h3>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {topic.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-800/70 text-[11px] text-zinc-500 truncate">
                        {topic.keywords}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. TWO COLUMNS: RÉCEMMENT AJOUTÉ & RÉCEMMENT MODIFIÉ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Récemment ajouté */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    RÉCEMMENT AJOUTÉ
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-[#12151B] divide-y divide-zinc-800/60 overflow-hidden">
                  {recentlyAdded.length === 0 ? (
                    <div className="p-4 text-xs text-zinc-500 text-center">
                      Aucune page récemment ajoutée
                    </div>
                  ) : (
                    recentlyAdded.map((page) => (
                      <div
                        key={page.id}
                        onClick={() => onSelectPage(page)}
                        className="p-3.5 hover:bg-zinc-800/40 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-zinc-500 group-hover:text-emerald-400 shrink-0">
                            📖
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-200 group-hover:text-emerald-300 truncate">
                              {page.title}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              {page.topic || "Réseaux"} • {getRelativeDate(page.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">{renderStatusBadge(page)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Récemment modifié */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    RÉCEMMENT MODIFIÉ
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-[#12151B] divide-y divide-zinc-800/60 overflow-hidden">
                  {recentlyModified.length === 0 ? (
                    <div className="p-4 text-xs text-zinc-500 text-center">
                      Aucune page récemment modifiée
                    </div>
                  ) : (
                    recentlyModified.map((page) => {
                      const editorName =
                        page.last_editor_name || page.author_name || "Membre";

                      return (
                        <div
                          key={page.id}
                          onClick={() => onSelectPage(page)}
                          className="p-3.5 hover:bg-zinc-800/40 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-zinc-500 group-hover:text-emerald-400 shrink-0">
                              📖
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-zinc-200 group-hover:text-emerald-300 truncate">
                                {page.title}
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">
                                Par {editorName} • {getRelativeDate(page.updated_at)}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                              v{page.current_version || page.history?.length || 1}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
