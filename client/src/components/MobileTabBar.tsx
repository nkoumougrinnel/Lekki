import React from "react";
import { BookOpen, FolderOpen, GraduationCap, Home, LayoutGrid, Menu, Sparkles } from "lucide-react";
import type { NavView, Workspace } from "@/types/lekki";
import { spaceWording } from "@/lib/spaces";

interface MobileTabBarProps {
  currentView: NavView;
  activeWorkspace: Workspace | null;
  revisionOpen: boolean;
  aiOpen: boolean;
  onNavigate: (view: NavView) => void;
  onOpenRevision: () => void;
  onOpenAI: () => void;
  onOpenMenu: () => void;
}

interface Tab {
  key: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onPress: () => void;
}

/**
 * Barre d'onglets du téléphone : les 4 endroits où un étudiant va tout le temps
 * sont à portée du pouce ; le reste (wiki, personnel, administration) est dans « Plus ».
 */
export function MobileTabBar({
  currentView, activeWorkspace, revisionOpen, aiOpen, onNavigate, onOpenRevision, onOpenAI, onOpenMenu,
}: MobileTabBarProps) {
  const wording = spaceWording(activeWorkspace);
  const overlay = revisionOpen || aiOpen;
  const docsView: NavView = activeWorkspace ? "workspace_files" : "my_docs";

  const tabs: Tab[] = [
    { key: "home", label: "Accueil", icon: Home, active: !overlay && currentView === "home", onPress: () => onNavigate("home") },
  ];
  if (wording.kind === "promo") {
    tabs.push({
      key: "subjects", label: "Matières", icon: LayoutGrid,
      active: !overlay && (currentView === "subjects" || currentView === "subject"),
      onPress: () => onNavigate("subjects"),
    });
  }
  tabs.push({
    key: "docs", label: "Documents", icon: FolderOpen,
    active: !overlay && currentView === docsView, onPress: () => onNavigate(docsView),
  });
  if (wording.study) {
    tabs.push({ key: "revise", label: "Réviser", icon: GraduationCap, active: revisionOpen, onPress: onOpenRevision });
  } else {
    tabs.push({
      key: "wiki", label: "Wiki", icon: BookOpen,
      active: !overlay && currentView === "workspace_wiki", onPress: () => onNavigate("workspace_wiki"),
    });
  }
  if (tabs.length < 4) {
    tabs.push({ key: "ai", label: "Lekki AI", icon: Sparkles, active: aiOpen, onPress: onOpenAI });
  }
  tabs.push({ key: "more", label: "Plus", icon: Menu, active: false, onPress: onOpenMenu });

  return (
    <nav
      aria-label="Navigation principale"
      className="lg:hidden shrink-0 border-t border-white/[0.07] bg-[#1B1F25]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {tabs.map(({ key, label, icon: Icon, active, onPress }) => (
          <li key={key} className="flex-1">
            <button
              type="button"
              onClick={onPress}
              aria-current={active ? "page" : undefined}
              className={`flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none transition-colors focus-visible:bg-white/[0.04] ${
                active ? "text-emerald-400" : "text-zinc-500 active:text-zinc-200"
              }`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-emerald-400/12" : ""}`}>
                <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.3 : 1.9} />
              </span>
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
