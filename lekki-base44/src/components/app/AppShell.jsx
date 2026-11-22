import { Link } from "@tanstack/react-router";
import { LogOut, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LekkiMark } from "@/components/brand/LekkiLogo";
import { AppRail } from "@/components/app/AppRail";
import { useAuth } from "@/lib/AuthContext";
import { initialsOf } from "@/lib/lekki";
import { cn } from "@/lib/utils";

export function AppShell({ espaces = [], activeEspaceId, onCreate, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#FBFAF6]">
      <AppRail espaces={espaces} activeEspaceId={activeEspaceId} onCreate={onCreate} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "h-14 shrink-0 items-center justify-between border-b border-[#E7E4D9] bg-[#FBFAF6] px-4 md:hidden",
            activeEspaceId ? "hidden" : "flex",
          )}
        >
          <Link to="/accueil" className="flex items-center gap-2">
            <LekkiMark size={28} />
            <span className="font-heading text-base font-semibold text-[#16241D]">Lekki</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCreate}
              className="flex h-9 items-center gap-1.5 rounded-full bg-[#16241D] px-3 text-[12.5px] font-semibold text-[#FBFAF6]"
            >
              <Plus className="h-3.5 w-3.5" /> Espace
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Mon compte"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D8EAD9] text-[11px] font-semibold text-[#256A4C]"
                >
                  {initialsOf(user?.full_name, user?.email)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="truncate text-[12.5px] font-medium text-[#16241D]">
                    {user?.full_name || "Mon compte"}
                  </p>
                  <p className="truncate text-[11px] text-[#8A968E]">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => logout()}>
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}