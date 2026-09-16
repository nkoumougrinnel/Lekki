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
} from "lucide-react";

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
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
  counts = {},
}: SidebarProps) {
  const { activeWorkspace } = useWorkspace();

  const navItemClass = (isActive: boolean) =>
    `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group select-none ${
      isActive
        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent"
    }`;

  return (
    <aside
      id="lekki-app-sidebar"
      className="w-64 bg-[#0E1116] border-r border-zinc-800/80 flex flex-col justify-between shrink-0 select-none overflow-y-auto"
    >
      <div className="p-4 space-y-8">
        
        {/* Navigation Item: Accueil */}
        <div>
          <button
            id="sidebar-nav-home"
            onClick={() => onSelectView("home")}
            className={navItemClass(currentView === "home")}
          >
            <div className="flex items-center gap-3">
              <Home className={`h-4.5 w-4.5 ${currentView === "home" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
              <span>Accueil</span>
            </div>
          </button>
        </div>

        {/* Section: MON ESPACE */}
        <div className="space-y-2">
          <div className="px-3 text-[11px] font-mono tracking-wider text-zinc-500 uppercase font-bold">
            Mon Espace
          </div>
          <div className="space-y-1">
            <button
              id="sidebar-nav-my-docs"
              onClick={() => onSelectView("my_docs")}
              className={navItemClass(currentView === "my_docs")}
            >
              <div className="flex items-center gap-3">
                <FolderLock className={`h-4.5 w-4.5 ${currentView === "my_docs" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                <span>Mes documents</span>
              </div>
              {counts.myDocs !== undefined && (
                <span className="text-[11px] font-mono text-zinc-500">
                  {counts.myDocs}
                </span>
              )}
            </button>

            <button
              id="sidebar-nav-starred"
              onClick={() => onSelectView("starred")}
              className={navItemClass(currentView === "starred")}
            >
              <div className="flex items-center gap-3">
                <Star className={`h-4.5 w-4.5 ${currentView === "starred" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                <span>Favoris</span>
              </div>
              {counts.starred !== undefined && (
                <span className="text-[11px] font-mono text-zinc-500">
                  {counts.starred}
                </span>
              )}
            </button>

            <button
              id="sidebar-nav-shared"
              onClick={() => onSelectView("shared_with_me")}
              className={navItemClass(currentView === "shared_with_me")}
            >
              <div className="flex items-center gap-3">
                <Share2 className={`h-4.5 w-4.5 ${currentView === "shared_with_me" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                <span>Partagés avec moi</span>
              </div>
              {counts.sharedWithMe !== undefined && (
                <span className="text-[11px] font-mono text-zinc-500">
                  {counts.sharedWithMe}
                </span>
              )}
            </button>

            <button
              id="sidebar-nav-trash"
              onClick={() => onSelectView("trash")}
              className={navItemClass(currentView === "trash")}
            >
              <div className="flex items-center gap-3">
                <Trash2 className={`h-4.5 w-4.5 ${currentView === "trash" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                <span>Corbeille</span>
              </div>
              {counts.trash !== undefined && (
                <span className="text-[11px] font-mono text-zinc-500">
                  {counts.trash}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Section: ESPACE ACTUEL (Workspace actif) */}
        <div className="space-y-2">
          <div className="px-3 flex items-center justify-between text-[11px] font-mono tracking-wider text-zinc-500 uppercase font-bold">
            <span>Espace Actuel</span>
            <span className="truncate max-w-[100px] text-emerald-500/80">
              {activeWorkspace?.name || "Workspace"}
            </span>
          </div>

          <div className="space-y-1">
            <button
              id="sidebar-nav-workspace-files"
              onClick={() => onSelectView("workspace_files")}
              className={navItemClass(currentView === "workspace_files")}
            >
              <div className="flex items-center gap-3">
                <Files className={`h-4.5 w-4.5 ${currentView === "workspace_files" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                <span>Fichiers partagés</span>
              </div>
              {counts.workspaceFiles !== undefined && (
                <span className="text-[11px] font-mono text-zinc-500">
                  {counts.workspaceFiles}
                </span>
              )}
            </button>

            <button
              id="sidebar-nav-workspace-wiki"
              onClick={() => onSelectView("workspace_wiki")}
              className={navItemClass(currentView === "workspace_wiki")}
            >
              <div className="flex items-center gap-3">
                <BookOpen className={`h-4.5 w-4.5 ${currentView === "workspace_wiki" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                <span>Wiki d'équipe</span>
              </div>
              {counts.workspaceWiki !== undefined && (
                <span className="text-[11px] font-mono text-zinc-500">
                  {counts.workspaceWiki}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
