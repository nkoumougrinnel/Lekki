import React, { useState } from "react";
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
  Settings,
  X,
  ChevronsUpDown,
  Building2,
  GraduationCap,
  Cpu,
  Folder,
  Check,
} from "lucide-react";

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  onOpenWorkspaceSettings?: () => void;
  counts?: {
    myDocs?: number;
    starred?: number;
    sharedWithMe?: number;
    trash?: number;
    workspaceFiles?: number;
    workspaceWiki?: number;
  };
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  currentView,
  onSelectView,
  onOpenWorkspaceSettings,
  counts = {},
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const [wsSwitcherOpen, setWsSwitcherOpen] = useState(false);

  const getWorkspaceIcon = (iconName?: string) => {
    switch (iconName) {
      case "GraduationCap": return <GraduationCap className="h-4 w-4" />;
      case "Building2":     return <Building2 className="h-4 w-4" />;
      case "Cpu":           return <Cpu className="h-4 w-4" />;
      default:              return <Folder className="h-4 w-4" />;
    }
  };

  const navItemClass = (isActive: boolean) =>
    `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group select-none ${
      isActive
        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent"
    }`;

  const handleSelect = (view: NavView) => {
    onSelectView(view);
    onMobileClose?.();
  };

  const handleSwitchWs = (wsId: string) => {
    setActiveWorkspace(wsId);
    setWsSwitcherOpen(false);
  };

  /* ── Modal centré pour switcher le workspace ── */
  const WorkspaceSwitcherModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => setWsSwitcherOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel centré */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[#13161E] border border-zinc-700/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
            Changer de workspace
          </span>
          <button
            onClick={() => setWsSwitcherOpen(false)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Liste */}
        <div className="py-2 max-h-72 overflow-y-auto">
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspace?.id;
            return (
              <button
                key={ws.id}
                onClick={() => handleSwitchWs(ws.id)}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-400"
                }`}>
                  {getWorkspaceIcon(ws.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{ws.name}</div>
                  {ws.description && (
                    <div className="text-[11px] text-zinc-500 truncate">{ws.description}</div>
                  )}
                </div>
                {isActive && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ── Contenu de la sidebar ── */
  const sidebarContent = (
    <div className="p-4 space-y-6">
      {/* Accueil */}
      <button
        id="sidebar-nav-home"
        onClick={() => handleSelect("home")}
        className={navItemClass(currentView === "home")}
      >
        <div className="flex items-center gap-3">
          <Home className={`h-4 w-4 ${currentView === "home" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
          <span>Accueil</span>
        </div>
      </button>

      {/* MON ESPACE */}
      <div className="space-y-1">
        <div className="px-3 mb-1 text-[11px] font-mono tracking-wider text-zinc-600 uppercase font-bold">
          Mon Espace
        </div>

        <button id="sidebar-nav-my-docs" onClick={() => handleSelect("my_docs")} className={navItemClass(currentView === "my_docs")}>
          <div className="flex items-center gap-3">
            <FolderLock className={`h-4 w-4 ${currentView === "my_docs" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
            <span>Mes documents</span>
          </div>
          {counts.myDocs !== undefined && <span className="text-[11px] font-mono text-zinc-500">{counts.myDocs}</span>}
        </button>

        <button id="sidebar-nav-starred" onClick={() => handleSelect("starred")} className={navItemClass(currentView === "starred")}>
          <div className="flex items-center gap-3">
            <Star className={`h-4 w-4 ${currentView === "starred" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
            <span>Favoris</span>
          </div>
          {counts.starred !== undefined && <span className="text-[11px] font-mono text-zinc-500">{counts.starred}</span>}
        </button>

        <button id="sidebar-nav-shared" onClick={() => handleSelect("shared_with_me")} className={navItemClass(currentView === "shared_with_me")}>
          <div className="flex items-center gap-3">
            <Share2 className={`h-4 w-4 ${currentView === "shared_with_me" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
            <span>Partagés avec moi</span>
          </div>
          {counts.sharedWithMe !== undefined && <span className="text-[11px] font-mono text-zinc-500">{counts.sharedWithMe}</span>}
        </button>

        <button id="sidebar-nav-trash" onClick={() => handleSelect("trash")} className={navItemClass(currentView === "trash")}>
          <div className="flex items-center gap-3">
            <Trash2 className={`h-4 w-4 ${currentView === "trash" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
            <span>Corbeille</span>
          </div>
          {counts.trash !== undefined && <span className="text-[11px] font-mono text-zinc-500">{counts.trash}</span>}
        </button>
      </div>

      {/* WORKSPACE — bouton switcher + liens */}
      <div className="space-y-1">
        {/* Bouton workspace cliquable = ouvre modal centré */}
        <button
          id="sidebar-workspace-switcher"
          onClick={() => setWsSwitcherOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-zinc-800/80 hover:border-emerald-500/30 bg-zinc-900/30 hover:bg-emerald-500/5 text-sm transition-all group mb-1"
          title="Changer de workspace"
        >
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-emerald-400 bg-emerald-500/10 border border-emerald-500/20`}>
            {getWorkspaceIcon(activeWorkspace?.icon)}
          </div>
          <span className="flex-1 text-left truncate font-semibold text-zinc-200 text-sm">
            {activeWorkspace?.name || "Workspace"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0" />
        </button>

        {/* Liens du workspace actif — toujours visibles */}
        <button id="sidebar-nav-workspace-files" onClick={() => handleSelect("workspace_files")} className={navItemClass(currentView === "workspace_files")}>
          <div className="flex items-center gap-3">
            <Files className={`h-4 w-4 ${currentView === "workspace_files" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
            <span>Drive partagé</span>
          </div>
          {counts.workspaceFiles !== undefined && <span className="text-[11px] font-mono text-zinc-500">{counts.workspaceFiles}</span>}
        </button>

        <button id="sidebar-nav-workspace-wiki" onClick={() => handleSelect("workspace_wiki")} className={navItemClass(currentView === "workspace_wiki")}>
          <div className="flex items-center gap-3">
            <BookOpen className={`h-4 w-4 ${currentView === "workspace_wiki" ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
            <span>Wiki d'équipe</span>
          </div>
          {counts.workspaceWiki !== undefined && <span className="text-[11px] font-mono text-zinc-500">{counts.workspaceWiki}</span>}
        </button>

        {activeWorkspace &&
          (activeWorkspace.role === "admin" || activeWorkspace.role === "owner") &&
          onOpenWorkspaceSettings && (
            <button
              onClick={() => { onOpenWorkspaceSettings(); onMobileClose?.(); }}
              className={navItemClass(false)}
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
                <span>Réglages</span>
              </div>
            </button>
          )}
      </div>
    </div>
  );

  return (
    <>
      {/* Modal centré de sélection du workspace */}
      {wsSwitcherOpen && <WorkspaceSwitcherModal />}

      {/* ── Desktop sidebar ── */}
      <aside
        id="lekki-app-sidebar"
        className="hidden lg:flex w-64 bg-[#0E1116] border-r border-zinc-800/80 flex-col shrink-0 select-none overflow-y-auto"
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
          <aside
            id="lekki-app-sidebar-mobile"
            className="relative z-50 w-72 max-w-[85vw] bg-[#0E1116] border-r border-zinc-800/80 flex flex-col overflow-y-auto animate-in slide-in-from-left duration-200"
          >
            {/* Header drawer */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Navigation</span>
              <button
                onClick={onMobileClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
