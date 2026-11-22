import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { AudioLines, FileText, ListChecks, Network, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuizRunner } from "@/components/notebook/QuizRunner";

const meta = {
  fiche: { icon: FileText, label: "Fiche de révision" },
  quiz: { icon: ListChecks, label: "Quiz" },
  carte: { icon: Network, label: "Carte mentale" },
  audio: { icon: AudioLines, label: "Résumé audio" },
};

export function ArtefactDialog({ artefact, open, onOpenChange, onDelete }) {
  const parsed = useMemo(() => {
    if (!artefact || !["quiz", "carte"].includes(artefact.type)) return null;
    try {
      return JSON.parse(artefact.content || "{}");
    } catch {
      return null;
    }
  }, [artefact]);

  if (!artefact) return null;
  const current = meta[artefact.type] || meta.fiche;
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-[#E7E4D9] bg-white p-0">
        <DialogHeader className="shrink-0 border-b border-[#F1EFE6] px-5 py-4 text-left">
          <div className="flex items-start gap-3 pr-8">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF2E7] text-[#2E7D5B]">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A968E]">
                {current.label}
              </p>
              <DialogTitle className="mt-0.5 truncate font-heading text-[15px] font-semibold text-[#16241D]">
                {artefact.title}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => onDelete?.(artefact)}
              aria-label="Supprimer cet élément"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#B3B7AE] transition-colors hover:bg-[#F8E9E3] hover:text-[#9C4F37]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {artefact.type === "fiche" && (
            <div className="lekki-prose">
              <ReactMarkdown>{artefact.content}</ReactMarkdown>
            </div>
          )}

          {artefact.type === "quiz" &&
            (parsed?.questions?.length ? (
              <QuizRunner questions={parsed.questions} />
            ) : (
              <p className="text-sm text-[#8A968E]">Ce quiz n’a pas pu être relu.</p>
            ))}

          {artefact.type === "carte" &&
            (parsed?.branches?.length ? (
              <div>
                <p className="font-heading text-lg font-semibold text-[#16241D]">
                  {parsed.title || artefact.title}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {parsed.branches.map((branch, index) => (
                    <div
                      key={`${branch.title}-${index}`}
                      className="rounded-xl border border-[#E7E4D9] bg-[#FBFAF6] p-3.5"
                    >
                      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#16241D]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D5B]" />
                        {branch.title}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {(branch.points || []).map((point) => (
                          <li key={point} className="flex gap-1.5 text-[11.5px] leading-relaxed text-[#5C6B62]">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#C9D9CC]" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#8A968E]">Cette carte n’a pas pu être relue.</p>
            ))}

          {artefact.type === "audio" && (
            <div>
              {artefact.audio_url ? (
                <audio controls src={artefact.audio_url} className="w-full" />
              ) : (
                <p className="text-sm text-[#8A968E]">L’audio n’est pas disponible.</p>
              )}
              <div className="mt-5 rounded-xl bg-[#FBFAF6] p-4">
                <p className="eyebrow text-[9px] text-[#8A968E]">Script</p>
                <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#3C4A41]">
                  {artefact.content}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}