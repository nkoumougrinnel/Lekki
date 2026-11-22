import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Home as HomeIcon,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import { LekkiMark } from "@/components/brand/LekkiLogo";
import { useAuth } from "@/lib/AuthContext";
import { initialsOf } from "@/lib/lekki";
import { cn } from "@/lib/utils";

export function AppRail({ espaces = [], activeEspaceId, onCreate }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("lekki-rail-collapsed") === "1");
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("lekki-rail-collapsed", next ? "1" : "0");
  };

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-[#E7E4D9] bg-[#F7F5EF] transition-[width] duration-300 md:flex",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      <div className="flex h-16 items-center justify-between px-3">
        <Link to="/accueil" className="flex items-center gap-2.5 overflow-hidden">
          <LekkiMark size={30} />
          {!collapsed && (
            <span className="font-heading text-[1.05rem] font-semibold tracking-[-0.02em] text-[#16241D]">
              Lekki
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8A968E] transition-colors hover:bg-[#16241D]/[0.06] hover:text-[#16241D]"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={onCreate}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-xl bg-[#16241D] text-[13px] font-semibold text-[#FBFAF6] transition-colors hover:bg-[#24382D]",
            collapsed ? "justify-center px-0" : "px-3.5",
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Nouvel espace</span>}
        </button>
      </div>

      <nav className="mt-4 px-2">
        <Link
          to="/accueil"
          className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-[#3C4A41] transition-colors hover:bg-[#16241D]/[0.05] hover:text-[#16241D]"
        >
          <HomeIcon className="h-4 w-4 shrink-0 text-[#5C6B62]" />
          {!collapsed && <span>Accueil</span>}
        </Link>
      </nav>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {!collapsed && (
          <p className="eyebrow px-2.5 pb-2 text-[9.5px] text-[#8A968E]">Espaces récents</p>
        )}
        <ul className="space-y-0.5">
          {espaces.slice(0, 8).map((espace) => {
            const active = espace.id === activeEspaceId;
            return (
              <li key={espace.id}>
                <Link
                  to="/espaces/$espaceId"
                  params={{ espaceId: espace.id }}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
                    active
                      ? "bg-white text-[#16241D] shadow-[0_1px_2px_rgba(22,36,29,0.06)]"
                      : "text-[#5C6B62] hover:bg-[#16241D]/[0.05] hover:text-[#16241D]",
                    collapsed && "justify-center px-0",
                  )}
                  title={espace.name}
                >
                  <span className="text-[15px] leading-none">{espace.emoji || "📚"}</span>
                  {!collapsed && <span className="truncate">{espace.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-[#E7E4D9] p-3">
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D8EAD9] text-[11px] font-semibold text-[#256A4C]">
            {initialsOf(user?.full_name, user?.email)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-[#16241D]">
                {user?.full_name || "Mon compte"}
              </p>
              <p className="truncate text-[11px] text-[#8A968E]">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => logout()}
              aria-label="Se déconnecter"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#8A968E] transition-colors hover:bg-[#16241D]/[0.06] hover:text-[#16241D]"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}