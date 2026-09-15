import React from "react";
import { DriveFile, WikiPage, Workspace, NavView } from "@/types/lekki";
import {
  Sparkles,
  Files,
  BookOpen,
  Share2,
  FolderLock,
  ArrowRight,
  ShieldCheck,
  Search,
  CheckCircle2,
  FileText,
  Compass,
} from "lucide-react";

interface HomeOverviewProps {
  files: DriveFile[];
  wikiPages: WikiPage[];
  activeWorkspace: Workspace | null;
  onNavigate: (view: NavView) => void;
  onOpenFile: (file: DriveFile) => void;
  onOpenWiki: (page: WikiPage) => void;
  onOpenSearch: () => void;
  onOpenAI: () => void;
}

export function HomeOverview({
  files,
  wikiPages,
  activeWorkspace,
  onNavigate,
  onOpenFile,
  onOpenWiki,
  onOpenSearch,
  onOpenAI,
}: HomeOverviewProps) {
  // Counts
  const personalCount = files.filter((f) => !f.workspace_id && !f.is_deleted).length;
  const sharedCount = files.filter((f) => f.shared_with && f.shared_with.length > 0 && !f.is_deleted).length;
  const wsFilesCount = files.filter((f) => f.workspace_id === activeWorkspace?.id && !f.is_deleted).length;
  const verifiedWikiCount = wikiPages.filter((w) => w.status === "verified").length;

  const recentFiles = [...files]
    .filter((f) => !f.is_deleted)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const topWikiPages = [...wikiPages]
    .sort((a, b) => (b.status === "verified" ? 1 : 0) - (a.status === "verified" ? 1 : 0))
    .slice(0, 4);

  return (
    <div id="home-overview-container" className="flex-1 overflow-y-auto bg-[#0E1116] p-6 sm:p-8 space-y-8">
      {/* Brand Hero Greeting */}
      <div className="rounded-2xl bg-gradient-to-r from-[#141820] to-[#181D26] border border-zinc-800/80 p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Store it. Share it. Understand it.</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Bienvenue dans votre espace documentaire intelligent
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Lekki unifie vos fichiers personnels, vos dossiers partagés et la mémoire
            collective de votre Workspace pour que chaque document devienne une
            connaissance immédiatement exploitable.
          </p>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button
              onClick={onOpenAI}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors shadow-md shadow-emerald-500/15"
            >
              <Sparkles className="h-4 w-4" />
              <span>Interroger Lekki AI</span>
            </button>
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-zinc-400" />
              <span>Recherche globale (⌘K)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Pillars of Knowledge Perimeter (Section 3 & 4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <button
          onClick={() => onNavigate("my_docs")}
          className="p-4 rounded-xl bg-[#12151B] hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 text-left transition-all group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <FolderLock className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-mono font-semibold text-zinc-300">
              {personalCount}
            </span>
          </div>
          <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300">
            Mon Espace Privé
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
            Documents personnels
          </p>
        </button>

        <button
          onClick={() => onNavigate("shared_with_me")}
          className="p-4 rounded-xl bg-[#12151B] hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 text-left transition-all group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <Share2 className="h-5 w-5 text-sky-400" />
            <span className="text-xs font-mono font-semibold text-zinc-300">
              {sharedCount}
            </span>
          </div>
          <div className="text-xs font-semibold text-zinc-200 group-hover:text-sky-300">
            Partagés avec moi
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
            Ressources reçues
          </p>
        </button>

        <button
          onClick={() => onNavigate("workspace_files")}
          className="p-4 rounded-xl bg-[#12151B] hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 text-left transition-all group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <Files className="h-5 w-5 text-amber-400" />
            <span className="text-xs font-mono font-semibold text-zinc-300">
              {wsFilesCount}
            </span>
          </div>
          <div className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300 truncate">
            {activeWorkspace?.name || "Workspace"}
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
            Drive du Workspace
          </p>
        </button>

        <button
          onClick={() => onNavigate("workspace_wiki")}
          className="p-4 rounded-xl bg-[#12151B] hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 text-left transition-all group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-mono font-semibold text-zinc-300">
              {wikiPages.length}
            </span>
          </div>
          <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300">
            Wiki Collaboratif
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
            {verifiedWikiCount} vérifiée{verifiedWikiCount > 1 ? "s" : ""}
          </p>
        </button>
      </div>

      {/* Two Columns: Recent Documents & Top Wiki Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Recent Documents */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-semibold uppercase font-mono tracking-wider text-zinc-300">
                Documents récents dans votre périmètre
              </h2>
            </div>
            <button
              onClick={() => onNavigate("workspace_files")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2">
            {recentFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => onOpenFile(file)}
                className="p-3 rounded-xl bg-[#12151B] hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded bg-zinc-800 border border-zinc-700/60 shrink-0">
                    <FileText className="h-4 w-4 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-200 group-hover:text-emerald-300 truncate">
                      {file.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {file.summary || `${file.owner_name} • ${file.page_count ? `${file.page_count} pages` : "Fichier"}`}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-[10px] font-mono text-zinc-500">
                  {new Date(file.updated_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Top Wiki Pages */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-semibold uppercase font-mono tracking-wider text-zinc-300">
                Mémoire collective — Fiches clés
              </h2>
            </div>
            <button
              onClick={() => onNavigate("workspace_wiki")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              Accéder au Wiki <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2">
            {topWikiPages.map((page) => (
              <div
                key={page.id}
                onClick={() => onOpenWiki(page)}
                className="p-3 rounded-xl bg-[#12151B] hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 flex items-start justify-between gap-3 cursor-pointer transition-colors group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-200 group-hover:text-emerald-300 truncate">
                      {page.title}
                    </span>
                    {page.status === "verified" && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                        🟢 Vérifiée
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1">
                    {page.content.replace(/[#*`_]/g, "").slice(0, 100)}...
                  </p>
                </div>

                <div className="shrink-0 text-[10px] font-mono text-zinc-500">
                  v{page.current_version}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 18: Les 3 manières d'exploiter la connaissance */}
      <div className="rounded-xl bg-[#12151B]/80 border border-zinc-800 p-5 space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-2">
          <Compass className="h-4 w-4 text-emerald-400" />
          <span>Les 3 manières d'exploiter la connaissance dans Lekki (Section 18)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-1.5">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>1.</span> Navigation structurée
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Explorez les dossiers du Drive et les fiches du Wiki par catégorie
              (Cours, Méthodes, Synthèses).
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-1.5">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>2.</span> Recherche unifiée
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Tapez une notion (ex: <code>OSPF</code>) pour obtenir simultanément les
              documents originaux, les fiches Wiki et les partages.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-1.5">
            <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <span>3.</span> Lekki AI (Assistant RAG)
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Posez directement vos questions. Lekki synthétise, cite les sources
              précises et signale toute divergence documentaire.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
