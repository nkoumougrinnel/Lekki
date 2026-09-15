import React from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { NavView } from "@/types/lekki";
import {
  Home,
  FolderLock,
  Star,
  Share2,
  Trash2,
  Files,
  BookOpen,
  Plus,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  onOpenNewFile: () => void;
  onOpenNewWiki: () => void;
  counts?: {
    myDocs?: number;
    starred?: number;
    sharedWithMe?: number;
    trash?: number;
    workspaceFiles?: number;
    workspaceWiki?: number;
  };
}

export function Sidebar({
  currentView,
  onSelectView,
  onOpenNewFile,
  onOpenNewWiki,
  counts = {},
}: SidebarProps) {
  const { activeWorkspace } = useWorkspace();

  const navItemClass = (isActive: boolean) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group select-none ${
      isActive
        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent"
    }`;

  return (
    <aside
      id="lekki-app-sidebar"
      className="w-64 bg-[#11141A] border-r border-border/60 flex flex-col justify-between shrink-0 select-none overflow-y-auto"
    >
      <div className="p-3 space-y-5">
        {/* Quick Action Buttons */}
        <div className="flex gap-1.5 pt-1">
          <button
            id="sidebar-new-file-btn"
            onClick={onOpenNewFile}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Document</span>
          </button>
          <button
            id="sidebar-new-wiki-btn"
            onClick={onOpenNewWiki}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700/60 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Fiche Wiki</span>
          </button>
        </div>

        {/* Navigation Item: Accueil */}
        <div>
          <button
            id="sidebar-nav-home"
            onClick={() => onSelectView("home")}
            className={navItemClass(currentView === "home")}
          >
            <div className="flex items-center gap-2.5">
              <Home className="h-4 w-4 text-emerald-400" />
              <span>Accueil</span>
            </div>
          </button>
        </div>

        {/* Section 19: MON ESPACE */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
            Mon Espace
          </div>
          <div className="space-y-0.5">
            <button
              id="sidebar-nav-my-docs"
              onClick={() => onSelectView("my_docs")}
              className={navItemClass(currentView === "my_docs")}
            >
              <div className="flex items-center gap-2.5">
                <FolderLock className="h-4 w-4 text-emerald-400/80" />
                <span>Mes documents</span>
              </div>
              {counts.myDocs !== undefined && (
                <span className="text-[11px] font-mono text-zinc-400">
                  {counts.myDocs}
                </span>
              )}
            </button>

            <button
              id="sidebar-nav-starred"
              onClick={() => onSelectView("starred")}
              className={navItemClass(currentView === "starred")}
            >
              <div className="flex items-center gap-2.5">
                <Star className="h-4 w-4 text-amber-400/90" />
                <span>Favoris</span>
              </div>
              {counts.starred !== undefined && (
                <span className="text-[11px] font-mono text-zinc-400">
                  {counts.starred}
                </span>
              )}
            </button>

            <button
              id="sidebar-nav-shared"
              onClick={() => onSelectView("shared_with_me")}
              className={navItemClass(currentView === "shared_with_me")}
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="h-4 w-4 text-sky-400/90" />
                <span>Partagés avec moi</span>
              </div>
              {counts.sharedWithMe !== undefined && (
                <span className="text-[11px] font-mono text-zinc-400">
                  {counts.sharedWithMe}
                </span>
              )}
            </button>

            <button
              id="sidebar-nav-trash"
              onClick={() => onSelectView("trash")}
              className={navItemClass(currentView === "trash")}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="h-4 w-4 text-rose-400/70" />
                <span>Corbeille</span>
              </div>
              {counts.trash !== undefined && (
                <span className="text-[11px] font-mono text-zinc-400">
                  {counts.trash}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Section 19: ESPACE ACTUEL (Workspace actif) */}
        <div className="space-y-1">
          <div className="px-3 flex items-center justify-between text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
            <span>Espace Actuel</span>
            <span className="truncate max-w-[100px] text-emerald-400">
              {activeWorkspace?.name || "Workspace"}
            </span>
          </div>

          <div className="space-y-0.5">
            <button
              id="sidebar-nav-workspace-files"
              onClick={() => onSelectView("workspace_files")}
              className={navItemClass(currentView === "workspace_files")}
            >
              <div className="flex items-center gap-2.5">
                <Files className="h-4 w-4 text-emerald-400" />
                <span>Fichiers</span>
              </div>
              {counts.workspaceFiles !== undefined && (
                <span className="text-[11px] font-mono text-zinc-400">
                  {counts.workspaceFiles}
                </span>
              )}
            </button>

            <button
              id="sidebar-nav-workspace-wiki"
              onClick={() => onSelectView("workspace_wiki")}
              className={navItemClass(currentView === "workspace_wiki")}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <span>Wiki</span>
              </div>
              {counts.workspaceWiki !== undefined && (
                <span className="text-[11px] font-mono text-zinc-400">
                  {counts.workspaceWiki}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Perimeter Principle Indicator (Section 4) */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/30">
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-2.5 text-[11px] text-zinc-400 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-zinc-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Périmètre de confiance</span>
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-400">
            Lekki ne connaît que ce à quoi vous avez accès. Vos documents privés ne
            sont jamais partagés sans votre accord.
          </p>
        </div>
      </div>
    </aside>
  );
}
