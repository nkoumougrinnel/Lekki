import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { accentOf, formatRelative } from "@/lib/lekki";
import { cn } from "@/lib/utils";

export function EspaceCard({ espace, sourceCount = 0, noteCount = 0, onDelete }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const accent = accentOf(espace.accent);

  return (
    <div className="group relative flex h-full flex-col rounded-2xl border border-[#E7E4D9] bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C9D9CC] hover:shadow-[0_26px_50px_-40px_rgba(22,36,29,0.55)]">
      <Link
        to="/espaces/$espaceId"
        params={{ espaceId: espace.id }}
        aria-label={`Ouvrir ${espace.name}`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E7D5B]/40"
      />

      <div className="pointer-events-none relative z-10 flex items-start justify-between">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-[20px]", accent.soft)}>
          {espace.emoji || "📚"}
        </span>
        <div className="pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Actions de l’espace"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#B3B7AE] opacity-0 transition-all hover:bg-[#16241D]/[0.06] hover:text-[#16241D] focus:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onSelect={() => setConfirmOpen(true)}
                className="text-[#9C4F37] focus:text-[#9C4F37]"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <h3 className="pointer-events-none relative z-10 mt-4 line-clamp-1 font-heading text-[15px] font-semibold tracking-[-0.01em] text-[#16241D]">
        {espace.name}
      </h3>
      <p className="pointer-events-none relative z-10 mt-1 line-clamp-2 min-h-[2.4em] text-[12.5px] leading-relaxed text-[#5C6B62]">
        {espace.description || "Aucune description pour l’instant."}
      </p>

      <div className="pointer-events-none relative z-10 mt-4 flex items-center gap-3 border-t border-[#F1EFE6] pt-3 text-[11px] text-[#8A968E]">
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" /> {sourceCount} source{sourceCount > 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> {noteCount} note{noteCount > 1 ? "s" : ""}
        </span>
        <span className="ml-auto">{formatRelative(espace.last_opened_at || espace.updated_date)}</span>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl border-[#E7E4D9] bg-[#FBFAF6]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-[#16241D]">
              Supprimer « {espace.name} » ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#5C6B62]">
              Les sources, notes et éléments du Studio de cet espace seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete?.(espace)}
              className="bg-[#9C4F37] text-white hover:bg-[#8A432D]"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}