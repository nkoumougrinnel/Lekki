import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Eye, PenLine, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function NoteEditorDialog({ draft, open, onOpenChange, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tab, setTab] = useState("write");

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title || "");
    setContent(draft.content || "");
    setTab("write");
  }, [draft]);

  const isEditing = Boolean(draft?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[86vh] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-[#E7E4D9] bg-[#FBFAF6] p-0">
        <DialogHeader className="shrink-0 border-b border-[#E7E4D9] px-5 py-4 text-left">
          <DialogTitle className="font-heading text-[15px] font-semibold text-[#16241D]">
            {isEditing ? "Modifier la note" : "Nouvelle note"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 py-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titre de la note"
            maxLength={140}
            className="border-[#E2DFD3] bg-white font-medium focus-visible:ring-[#2E7D5B]/20"
          />

          <div className="flex rounded-full bg-[#F1EFE6] p-1">
            {[
              { value: "write", label: "Écrire", icon: PenLine },
              { value: "preview", label: "Aperçu", icon: Eye },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                  tab === value
                    ? "bg-white text-[#16241D] shadow-[0_1px_2px_rgba(22,36,29,0.08)]"
                    : "text-[#5C6B62]",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#E2DFD3] bg-white">
            {tab === "write" ? (
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Écris ta note en markdown…"
                className="min-h-[240px] resize-none border-0 bg-transparent text-[13px] focus-visible:ring-0"
              />
            ) : (
              <div className="lekki-prose p-4">
                {content.trim() ? (
                  <ReactMarkdown>{content}</ReactMarkdown>
                ) : (
                  <p className="text-sm text-[#9AA096]">Rien à prévisualiser pour l’instant.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#E7E4D9] px-5 py-3">
          {isEditing ? (
            <button
              type="button"
              onClick={() => onDelete?.(draft)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] font-medium text-[#9C4F37] transition-colors hover:bg-[#F8E9E3]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => onSave({ id: draft?.id, title, content })}
              disabled={!title.trim() && !content.trim()}
              className="rounded-full bg-[#16241D] px-5 text-[#FBFAF6] hover:bg-[#24382D]"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}