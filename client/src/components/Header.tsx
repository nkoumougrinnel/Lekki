import React, { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Sparkles,
  ChevronDown,
  Plus,
  UserCheck,
  Building2,
  GraduationCap,
  Cpu,
  Folder,
} from "lucide-react";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";

interface HeaderProps {
  onOpenSearch: () => void;
  onToggleAI: () => void;
  isAIOpen: boolean;
}

export function Header({ onOpenSearch, onToggleAI, isAIOpen }: HeaderProps) {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { user, allUsers, switchUser } = useAuth();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateWsDialog, setShowCreateWsDialog] = useState(false);

  const getWorkspaceIcon = (iconName?: string) => {
    switch (iconName) {
      case "GraduationCap":
        return <GraduationCap className="h-4 w-4 text-emerald-400" />;
      case "Building2":
        return <Building2 className="h-4 w-4 text-sky-400" />;
      case "Cpu":
        return <Cpu className="h-4 w-4 text-amber-400" />;
      default:
        return <Folder className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <>
      <header
        id="lekki-app-header"
        className="h-14 border-b border-border/60 bg-[#0E1116] px-4 flex items-center justify-between gap-3 select-none shrink-0 z-30"
      >
        {/* Left: Logo & Active Workspace Context */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold tracking-tight">
              L
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-semibold text-sm tracking-wide text-zinc-100">
                  LEKKI
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 hidden md:block">
                Espace documentaire intelligent
              </p>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

          {/* Workspace Switcher Selector (Section 6 & 19) */}
          <div className="relative">
            <button
              id="header-workspace-selector"
              onClick={() => setShowWorkspaceMenu((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-200 transition-colors"
              title="Sélectionner le Workspace actif"
            >
              {getWorkspaceIcon(activeWorkspace?.icon)}
              <span className="truncate max-w-[130px] md:max-w-[180px]">
                {activeWorkspace ? activeWorkspace.name : "Sélectionner un Workspace"}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>

            {showWorkspaceMenu && (
              <div
                id="header-workspace-dropdown"
                className="absolute left-0 mt-1.5 w-64 rounded-lg bg-[#161A22] border border-zinc-700/80 shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3 py-1.5 border-b border-zinc-800 text-[10px] uppercase font-mono text-zinc-400">
                  Espaces de travail (Workspaces)
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspace(ws.id);
                        setShowWorkspaceMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-start gap-2.5 text-xs transition-colors ${
                        ws.id === activeWorkspace?.id
                          ? "bg-emerald-500/15 text-emerald-300 font-medium"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                      }`}
                    >
                      <span className="mt-0.5">{getWorkspaceIcon(ws.icon)}</span>
                      <div className="min-w-0">
                        <div className="truncate">{ws.name}</div>
                        {ws.description && (
                          <div className="text-[11px] text-zinc-500 truncate">
                            {ws.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-1 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      setShowWorkspaceMenu(false);
                      setShowCreateWsDialog(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-emerald-400 hover:bg-emerald-500/10 font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Créer un nouveau Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Unified Search Button / Bar (Section 15) */}
        <div className="flex-1 max-w-md mx-2">
          <button
            id="header-unified-search-btn"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 transition-all shadow-inner group"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
              <span className="truncate">Rechercher documents, wiki, partages...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-400 rounded border border-zinc-700/60">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Lekki AI Trigger & User Persona Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Lekki AI Trigger */}
          <button
            id="header-lekki-ai-toggle"
            onClick={onToggleAI}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isAIOpen
                ? "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lekki AI</span>
          </button>

          {/* User Persona Switcher (Allows testing multi-user sharing: Grinnel, Sarah, Marc) */}
          <div className="relative">
            <button
              id="header-user-persona-btn"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/80 border border-zinc-800 text-xs text-zinc-300 transition-colors"
              title="Changer d'utilisateur (Test multi-utilisateurs et partages)"
            >
              <div className="h-6 w-6 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-[11px]">
                {user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}
              </div>
              <span className="hidden md:inline font-medium max-w-[90px] truncate">
                {user?.name || user?.username || "Utilisateur"}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>

            {showUserMenu && (
              <div
                id="header-user-dropdown"
                className="absolute right-0 mt-1.5 w-60 rounded-lg bg-[#161A22] border border-zinc-700/80 shadow-2xl py-1 z-50"
              >
                <div className="px-3 py-2 border-b border-zinc-800">
                  <div className="text-xs font-semibold text-zinc-100">
                    {user?.name || user?.username}
                  </div>
                  <div className="text-[11px] text-zinc-400">{user?.email}</div>
                  <div className="mt-1 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> Connecté
                  </div>
                </div>

                <div className="px-3 py-1.5 text-[10px] uppercase font-mono text-zinc-500">
                  Changer d'utilisateur (Multi-accès)
                </div>
                <div className="py-0.5">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.username);
                        setShowUserMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${
                        u.id === user?.id
                          ? "bg-emerald-500/15 text-emerald-300 font-medium"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="truncate">
                        <span>{u.name || u.username}</span>
                        <span className="text-[10px] text-zinc-500 ml-1.5">
                          ({u.username})
                        </span>
                      </div>
                      {u.id === user?.id && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <CreateWorkspaceDialog
        open={showCreateWsDialog}
        onOpenChange={setShowCreateWsDialog}
      />
    </>
  );
}
