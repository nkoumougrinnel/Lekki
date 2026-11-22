import {
  AudioLines,
  FileText,
  ListChecks,
  Loader2,
  Network,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { formatRelative } from "@/lib/lekki";

const tools = [
  {
    type: "fiche",
    icon: FileText,
    label: "Fiche de révision",
    hint: "L’essentiel du cours, structuré",
    tint: "bg-[#EAF2E7]",
    ink: "text-[#2E7D5B]",
  },
  {
    type: "quiz",
    icon: ListChecks,
    label: "Quiz",
    hint: "10 questions corrigées",
    tint: "bg-[#FBF3E1]",
    ink: "text-[#8A6B2E]",
  },
  {
    type: "carte",
    icon: Network,
    label: "Carte mentale",
    hint: "Les notions reliées entre elles",
    tint: "bg-[#E6F0F3]",
    ink: "text-[#3A6572]",
  },
  {
    type: "audio",
    icon: AudioLines,
    label: "Résumé audio",
    hint: "À écouter en marchant",
    tint: "bg-[#F6E7C8]",
    ink: "text-[#8A6B2E]",
  },
];

const artefactMeta = {
  fiche: { icon: FileText, label: "Fiche" },
  quiz: { icon: ListChecks, label: "Quiz" },
  carte: { icon: Network, label: "Carte" },
  audio: { icon: AudioLines, label: "Audio" },
};

export function StudioPanel({
  artefacts,
  notes,
  generating,
  sourceCount,
  onGenerate,
  onOpenArtefact,
  onDeleteArtefact,
  onNewNote,
  onOpenNote,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[#E7E4D9] px-4 py-3">
        <span className="eyebrow text-[9.5px] text-[#5C6B62]">Studio</span>
        <span className="text-[10px] text-[#8A968E]">
          {sourceCount} source{sourceCount > 1 ? "s" : ""}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          {tools.map(({ type, icon: Icon, label, hint, tint, ink }) => {
            const busy = generating === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onGenerate(type)}
                disabled={Boolean(generating)}
                className="group flex flex-col rounded-xl border border-[#E7E4D9] bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#C9D9CC] hover:shadow-[0_16px_30px_-26px_rgba(22,36,29,0.6)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint} ${ink}`}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="mt-2.5 text-[11.5px] font-semibold leading-snug text-[#16241D]">
                  {label}
                </span>
                <span className="mt-0.5 text-[10px] leading-snug text-[#8A968E]">
                  {busy ? "Génération…" : hint}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between px-1">
            <p className="eyebrow text-[9px] text-[#8A968E]">Éléments générés</p>
            {artefacts.length > 0 && (
              <span className="text-[10px] text-[#B3B7AE]">{artefacts.length}</span>
            )}
          </div>

          {artefacts.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-[#D8D4C6] bg-white/60 px-3 py-3 text-[11px] leading-relaxed text-[#8A968E]">
              Génère une fiche ou un quiz : ils apparaîtront ici, prêts à rouvrir.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {artefacts.map((artefact) => {
                const meta = artefactMeta[artefact.type] || artefactMeta.fiche;
                const Icon = meta.icon;
                return (
                  <li key={artefact.id} className="group flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenArtefact(artefact)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-[#E7E4D9] hover:bg-white"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[#2E7D5B] ring-1 ring-[#E7E4D9]">
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] font-medium text-[#16241D]">
                          {artefact.title}
                        </span>
                        <span className="block text-[9.5px] text-[#8A968E]">
                          {meta.label} · {formatRelative(artefact.created_date)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteArtefact(artefact)}
                      aria-label="Supprimer"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#B3B7AE] opacity-0 transition-all hover:bg-[#F8E9E3] hover:text-[#9C4F37] focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between px-1">
            <p className="eyebrow flex items-center gap-1 text-[9px] text-[#8A968E]">
              <NotebookPen className="h-3 w-3" /> Notes
            </p>
            <button
              type="button"
              onClick={onNewNote}
              className="flex items-center gap-0.5 text-[10.5px] font-medium text-[#2E7D5B] transition-colors hover:text-[#256A4C]"
            >
              <Plus className="h-3 w-3" /> Nouvelle
            </button>
          </div>

          {notes.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-[#D8D4C6] bg-white/60 px-3 py-3 text-[11px] leading-relaxed text-[#8A968E]">
              Enregistre une réponse ou écris une note pour la garder ici.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {notes.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => onOpenNote(note)}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C99A3F]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-medium text-[#16241D]">
                        {note.title}
                      </span>
                      <span className="block truncate text-[10px] text-[#8A968E]">
                        {note.content?.slice(0, 70) || "Note vide"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl bg-[#EAF2E7]/70 px-3 py-2.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2E7D5B]" />
          <p className="text-[10.5px] leading-relaxed text-[#3C4A41]">
            Tout est généré à partir des sources sélectionnées, jamais d’Internet.
          </p>
        </div>
      </div>
    </div>
  );
}