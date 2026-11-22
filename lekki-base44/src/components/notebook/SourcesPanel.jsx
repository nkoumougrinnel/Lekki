import { FileText, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KIND_META, formatRelative } from "@/lib/lekki";

export function SourcesPanel({
  sources,
  selectedIds,
  loading,
  onToggle,
  onToggleAll,
  onAdd,
  onOpen,
  onDelete,
}) {
  const allSelected = sources.length > 0 && selectedIds.length === sources.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[#F1EFE6] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow text-[9.5px] text-[#5C6B62]">Sources</span>
          <span className="rounded-full bg-[#F1EFE6] px-1.5 py-0.5 text-[10px] font-medium text-[#5C6B62]">
            {sources.length}
          </span>
        </div>
        {sources.length > 0 && (
          <button
            type="button"
            onClick={onToggleAll}
            className="text-[11px] font-medium text-[#2E7D5B] transition-colors hover:text-[#256A4C]"
          >
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="space-y-2 px-1">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-12 animate-pulse rounded-xl bg-[#F7F5EF]" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="mx-1 mt-4 rounded-xl border border-dashed border-[#D8D4C6] bg-[#FBFAF6] px-4 py-8 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2E7] text-[#2E7D5B]">
              <FileText className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[12.5px] font-medium text-[#16241D]">Aucune source</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#8A968E]">
              Importe un cours, un TD ou un ancien sujet pour commencer.
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#2E7D5B]"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une source
            </button>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sources.map((source) => {
              const meta = KIND_META[source.kind] || KIND_META.txt;
              const selected = selectedIds.includes(source.id);
              return (
                <li
                  key={source.id}
                  className="group flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-[#FBFAF6]"
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggle(source.id)}
                    aria-label={`Sélectionner ${source.name}`}
                    className="mt-0.5 h-4 w-4 border-[#CFCABA] data-[state=checked]:border-[#2E7D5B] data-[state=checked]:bg-[#2E7D5B]"
                  />
                  <button
                    type="button"
                    onClick={() => onOpen(source)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[12.5px] font-medium leading-snug text-[#16241D]">
                      {source.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-[#8A968E]">
                      <span className={`rounded px-1 py-0.5 font-semibold ${meta.tone}`}>{meta.label}</span>
                      {source.page_count ? <span>{source.page_count} p.</span> : null}
                      <span className="truncate">{formatRelative(source.created_date)}</span>
                      {source.status === "indexing" && (
                        <Loader2 className="h-2.5 w-2.5 animate-spin text-[#C99A3F]" />
                      )}
                    </p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Actions de la source"
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#B3B7AE] opacity-0 transition-all hover:bg-[#16241D]/[0.06] hover:text-[#16241D] focus:opacity-100 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onSelect={() => onOpen(source)}>Ouvrir</DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onDelete(source)}
                        className="text-[#9C4F37] focus:text-[#9C4F37]"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-[#F1EFE6] p-3">
        <button
          type="button"
          onClick={onAdd}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D8D4C6] text-[12px] font-medium text-[#5C6B62] transition-colors hover:border-[#2E7D5B]/50 hover:text-[#2E7D5B]"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une source
        </button>
        <p className="mt-2 text-center text-[10px] text-[#B3B7AE]">
          {selectedIds.length} sur {sources.length} utilisée{sources.length > 1 ? "s" : ""} par Lekki
        </p>
      </div>
    </div>
  );
}