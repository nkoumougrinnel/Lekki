import React from "react";
import { DriveFile, WikiPage, Workspace, NavView } from "@/types/lekki";
import {
  Sparkles,
  Files,
  BookOpen,
  Share2,
  FolderLock,
  ArrowRight,
  Search,
  FileText,
  CheckCircle2,
  Users,
  Clock,
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

  // Documents: Only workspace files, sorted by recent
  const recentWorkspaceFiles = [...files]
    .filter((f) => f.workspace_id === activeWorkspace?.id && !f.is_deleted)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  // Wiki: Recent pages, sorted by recent
  const recentWikiPages = [...wikiPages]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      time: date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <div id="home-overview-container" className="flex-1 overflow-y-auto bg-[#0E1116] p-6 sm:p-8 space-y-8">
      {/* Brand Hero Greeting */}
      <div className="rounded-2xl bg-gradient-to-br from-[#141820] via-[#161B24] to-[#12151B] border border-zinc-800/80 p-6 sm:p-10 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100 leading-tight">
            Tout votre savoir, <span className="text-emerald-400">unifié et exploitable.</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
            Accédez instantanément à vos documents, collaborez via le Wiki et
            interrogez vos ressources avec Lekki AI pour transformer l'information en connaissance.
          </p>
        </div>
      </div>

      {/* 4 Pillars of Knowledge Perimeter */}
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

      {/* Two Columns: Recent Workspace Documents & Recent Wiki Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Recent Workspace Documents */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-semibold uppercase font-mono tracking-wider text-zinc-300">
                Documents du Workspace
              </h2>
            </div>
            <button
              onClick={() => onNavigate("workspace_files")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              Accéder au Drive <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2">
            {recentWorkspaceFiles.length > 0 ? (
              recentWorkspaceFiles.map((file) => {
                const { date, time } = formatDateTime(file.updated_at);
                return (
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
                          {file.summary || "Aucune description disponible"}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-mono text-zinc-300">{date}</div>
                      <div className="text-[9px] font-mono text-zinc-500">{time}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                Aucun document récent dans le workspace.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Recent Wiki Pages */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-semibold uppercase font-mono tracking-wider text-zinc-300">
                Pages Wiki récentes
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
            {recentWikiPages.length > 0 ? (
              recentWikiPages.map((page) => {
                const { date, time } = formatDateTime(page.updated_at);
                return (
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
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" title="Vérifiée" />
                        )}
                        {page.status === "community" && (
                          <Users className="h-3 w-3 text-sky-400 shrink-0" title="Communautaire" />
                        )}
                        {page.status === "draft" && (
                          <Clock className="h-3 w-3 text-amber-400 shrink-0" title="Brouillon" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">
                        {page.content.replace(/[#*`_]/g, "").slice(0, 100)}...
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-mono text-zinc-300">{date}</div>
                      <div className="text-[9px] font-mono text-zinc-500">{time}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                Aucune page Wiki récente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
