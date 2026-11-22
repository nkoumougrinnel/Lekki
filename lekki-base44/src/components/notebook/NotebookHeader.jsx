import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, FilePlus2, LogOut, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthContext";
import { accentOf, initialsOf } from "@/lib/lekki";
import { cn } from "@/lib/utils";

export function NotebookHeader({ espace, loading, sourceCount, noteCount, onAdd, onRename }) {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  const accent = accentOf(espace?.accent);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setValue(espace?.name || "");
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    onRename?.(value);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#E7E4D9] bg-[#FBFAF6] px-3 sm:px-4">
      <Link
        to="/accueil"
        aria-label="Retour aux espaces"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5C6B62] transition-colors hover:bg-[#16241D]/[0.06] hover:text-[#16241D] md:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px]",
          accent.soft,
        )}
      >
        {espace?.emoji || "📚"}
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commit();
                if (event.key === "Escape") setEditing(false);
              }}
              maxLength={80}
              className="h-7 w-full max-w-sm rounded-md border border-[#D8D4C6] bg-white px-2 text-[13.5px] font-medium text-[#16241D] outline-none focus:border-[#2E7D5B]"
            />
            <button
              type="button"
              onClick={commit}
              aria-label="Valider le nom"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#16241D] text-[#FBFAF6]"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="group flex max-w-full items-center gap-1.5 text-left"
            title="Renommer l’espace"
          >
            <span className="truncate font-heading text-[14px] font-semibold tracking-[-0.01em] text-[#16241D]">
              {loading ? "Chargement…" : espace?.name || "Espace"}
            </span>
            <Pencil className="h-3 w-3 shrink-0 text-[#B3B7AE] opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
        <p className="truncate text-[11px] text-[#8A968E]">
          {sourceCount} source{sourceCount > 1 ? "s" : ""} · {noteCount} note{noteCount > 1 ? "s" : ""}
        </p>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#D8D4C6] bg-white px-3.5 text-[12.5px] font-medium text-[#3C4A41] transition-colors hover:border-[#16241D]/30 hover:text-[#16241D]"
      >
        <FilePlus2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Ajouter une source</span>
        <span className="sm:hidden">Ajouter</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Mon compte"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D8EAD9] text-[10px] font-semibold text-[#256A4C] md:hidden"
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
    </header>
  );
}