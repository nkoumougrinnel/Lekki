import React, { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Sparkles,
  ChevronDown,
  Plus,
  Building2,
  GraduationCap,
  Cpu,
  Folder,
  LogOut,
  Settings,
  UserCircle,
  X,
  Menu,
} from "lucide-react";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { WorkspaceAdminDialog } from "./WorkspaceAdminDialog";
import { UnifiedSearchDialog } from "./UnifiedSearchDialog";

interface HeaderProps {
  onSelectDocument: (docId: string) => void;
  onSelectWiki: (wikiId: string) => void;
  onAskAI: (query: string) => void;
  onToggleAI: () => void;
  isAIOpen: boolean;
  onOpenMobileMenu?: () => void;
}

export function Header({
  onSelectDocument,
  onSelectWiki,
  onAskAI,
  onToggleAI,
  isAIOpen,
  onOpenMobileMenu,
}: HeaderProps) {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { user, logout } = useAuth();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateWsDialog, setShowCreateWsDialog] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
      {isSearchOpen && (
        <div className="fixed top-0 left-0 w-full z-[70] bg-[#0E1116]/98 backdrop-blur-md border-b border-zinc-800/80">
          <div className="px-4 sm:px-6 py-3 flex items-center gap-3 border-b border-zinc-800/60">
            <button
              onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0"
              aria-label="Fermer la recherche"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans tout le workspace..."
                className="w-full pl-10 pr-8 py-2 bg-transparent border-none text-base text-zinc-100 placeholder-zinc-500 focus:outline-none min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 shrink-0"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <UnifiedSearchDialog
            open={isSearchOpen}
            onOpenChange={(open) => {
              setIsSearchOpen(open);
              if (!open) setSearchQuery("");
            }}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onSelectDocument={(id) => { onSelectDocument(id); setIsSearchOpen(false); setSearchQuery(""); }}
            onSelectWiki={(id) => { onSelectWiki(id); setIsSearchOpen(false); setSearchQuery(""); }}
            onAskAI={(q) => { onAskAI(q); setIsSearchOpen(false); setSearchQuery(""); }}
          />
        </div>
      )}

      <header
        id="lekki-app-header"
        className="h-14 sm:h-16 border-b border-zinc-800/80 bg-[#0E1116]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 select-none shrink-0 z-30"
      >

        {/* Left: Hamburger + Logo + Workspace Selector */}
        <div className={`flex items-center gap-2 sm:gap-4 min-w-0 shrink-0 ${isSearchOpen ? "hidden" : ""}`}>
          {/* Hamburger — mobile only */}
          <button
            id="header-mobile-menu-btn"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <div className="hidden lg:flex h-16 w-64 shrink-0 border-r border-zinc-800/80 -ml-6 pl-6 items-center gap-3">
            <img src="/logo.svg" alt="Lekki Logo" className="h-8 w-8 hover:scale-105 transition-transform" />
            <span className="font-bold text-base tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 leading-none">
              LEKKI
            </span>
          </div>

          {/* Logo compact — mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <img src="/logo.svg" alt="Lekki Logo" className="h-7 w-7" />
            <span className="font-bold text-sm tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
              LEKKI
            </span>
          </div>

          {/* Workspace Switcher — desktop uniquement */}
          <div className="relative hidden lg:block">
            <button
              id="header-workspace-selector"
              onClick={() => setShowWorkspaceMenu((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-800/60 text-zinc-300 hover:text-zinc-100 transition-colors"
              title="Sélectionner le Workspace actif"
            >
              {getWorkspaceIcon(activeWorkspace?.icon)}
              <span className="truncate max-w-[200px]">
                {activeWorkspace ? activeWorkspace.name : "Sélectionner un Workspace"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
            </button>

            {showWorkspaceMenu && (
              <div
                id="header-workspace-dropdown"
                className="absolute left-0 mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-xl bg-[#161A22] border border-zinc-700/80 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center justify-between">
                  <span>Espaces de travail</span>
                  <button onClick={() => { setShowWorkspaceMenu(false); setShowCreateWsDialog(true); }} className="text-emerald-400 hover:text-emerald-300">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspace(ws.id);
                        setShowWorkspaceMenu(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left flex items-start gap-3 text-sm transition-colors ${
                        ws.id === activeWorkspace?.id
                          ? "bg-emerald-500/10 text-emerald-300 font-medium"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                      }`}
                    >
                      <span className="mt-0.5">{getWorkspaceIcon(ws.icon)}</span>
                      <div className="min-w-0">
                        <div className="truncate">{ws.name}</div>
                        {ws.description && (
                          <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {ws.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Search — hidden on mobile, full bar on sm+ */}
        <div className={`relative hidden sm:flex flex-1 max-w-xl mx-auto justify-center overflow-visible ${isSearchOpen ? "hidden" : ""}`}>
          <div className="w-full max-w-lg relative group">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-900/60 focus-within:bg-zinc-800/80 border border-zinc-800 focus-within:border-zinc-700 transition-all shadow-sm">
              <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Rechercher dans tout le workspace..."
                className="w-full bg-transparent border-none text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="hidden md:flex items-center gap-1">
                  <kbd className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-medium font-sans bg-zinc-800/80 text-zinc-400 rounded-md border border-zinc-700/60 shadow-sm">⌘K</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile : bouton pour ouvrir l'overlay de recherche */}
        <div className={`sm:hidden flex-1 mx-2 ${isSearchOpen ? "hidden" : ""}`}>
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border bg-zinc-900/70 border-zinc-800 text-left hover:border-zinc-700 transition-colors"
            aria-label="Ouvrir la recherche"
          >
            <Search className="h-4 w-4 text-zinc-500 shrink-0" />
            <span className="text-sm text-zinc-500">Rechercher...</span>
          </button>
        </div>

        {/* Right: AI + User */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Lekki AI Trigger */}
          <button
            id="header-lekki-ai-toggle"
            onClick={onToggleAI}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              isAIOpen
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                : "bg-zinc-900/50 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 shadow-sm"
            }`}
          >
            <Sparkles className={`h-4 w-4 ${isAIOpen ? "text-zinc-950" : "text-emerald-400"}`} />
            <span className="hidden sm:inline">{isAIOpen ? "Lekki AI Actif" : "Lekki AI"}</span>
          </button>

          <div className="h-5 w-[1px] bg-zinc-800/60 hidden sm:block" />

          {/* User Persona Switcher */}
          <div className="relative hidden lg:block">
            <button
              id="header-user-persona-btn"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-zinc-800/60 transition-colors"
              title="Compte Utilisateur"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-600/40 to-sky-600/40 border border-emerald-500/30 text-emerald-100 flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-transparent hover:ring-zinc-700 transition-all">
                {user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500 hidden md:block" />
            </button>

            {showUserMenu && (
              <div
                id="header-user-dropdown"
                className="absolute right-0 mt-2 w-64 rounded-xl bg-[#161A22] border border-zinc-700/80 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-4 py-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-600 to-sky-600 text-white flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-zinc-700">
                      {user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-zinc-100 truncate">
                        {user?.name || user?.username}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">{user?.email}</div>
                    </div>
                  </div>
                </div>

                <div className="p-1">
                  <button
                    className="w-full px-4 py-2 text-left flex items-center gap-3 text-sm text-zinc-300 hover:bg-zinc-800/60 rounded-lg transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <UserCircle className="h-4 w-4 text-zinc-500" />
                    Mon Profil
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left flex items-center gap-3 text-sm text-zinc-300 hover:bg-zinc-800/60 rounded-lg transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4 text-zinc-500" />
                    Paramètres du compte
                  </button>
                </div>


                <div className="p-1 border-t border-zinc-800/80 mt-1">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 font-medium transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </button>
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
      <WorkspaceAdminDialog
        open={showAdminDialog}
        onOpenChange={setShowAdminDialog}
      />
    </>
  );
}
