import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, FileText, FileUp, Loader2, Type, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { extractSource } from "@/lib/server-fns";
import { kindFromName } from "@/lib/lekki";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.docx,.pptx,.txt,.md";

export function AddSourcesDialog({ open, onOpenChange, espaceId, onAdded }) {
  const extractFn = useServerFn(extractSource);
  const inputRef = useRef(null);
  const [mode, setMode] = useState("file");
  const [queue, setQueue] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [pasteName, setPasteName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);

  const importFiles = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 10);
    if (!files.length || busy) return;
    setBusy(true);
    for (const file of files) {
      const id = `${file.name}-${file.size}-${Date.now()}`;
      setQueue((previous) => [...previous, { id, name: file.name, status: "working" }]);
      try {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        const extracted = await extractFn({
          data: { espaceId, name: file.name, fileUri: file_uri },
        });
        const created = await base44.entities.Source.create({
          espace_id: espaceId,
          name: file.name,
          kind: kindFromName(file.name),
          size_bytes: file.size,
          page_count: extracted.page_count || 0,
          summary: extracted.summary || "",
          content: extracted.content || "",
          key_points: extracted.key_points || [],
          chapters: extracted.chapters || [],
          file_uri,
          status: "ready",
        });
        setQueue((previous) =>
          previous.map((item) => (item.id === id ? { ...item, status: "done" } : item)),
        );
        onAdded(created);
      } catch {
        setQueue((previous) =>
          previous.map((item) => (item.id === id ? { ...item, status: "error" } : item)),
        );
        toast.error(`« ${file.name} » n’a pas pu être lu.`);
      }
    }
    setBusy(false);
  };

  const addText = async (event) => {
    event.preventDefault();
    if (!pasteText.trim() || busy) return;
    setBusy(true);
    const name = pasteName.trim() || "Note de cours";
    try {
      const extracted = await extractFn({ data: { espaceId, name, text: pasteText } });
      const created = await base44.entities.Source.create({
        espace_id: espaceId,
        name,
        kind: "note",
        size_bytes: pasteText.length,
        page_count: extracted.page_count || 0,
        summary: extracted.summary || "",
        content: extracted.content || "",
        key_points: extracted.key_points || [],
        chapters: extracted.chapters || [],
        status: "ready",
      });
      onAdded(created);
      setPasteName("");
      setPasteText("");
      toast.success("Source ajoutée.");
    } catch {
      toast.error("Impossible d’indexer ce texte.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 rounded-2xl border-[#E7E4D9] bg-[#FBFAF6] p-0">
        <DialogHeader className="border-b border-[#E7E4D9] px-6 py-5 text-left">
          <DialogTitle className="font-heading text-xl font-semibold tracking-[-0.02em] text-[#16241D]">
            Ajouter des sources
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#5C6B62]">
            Lekki lit le document, le résume et l’indexe. Tu pourras ensuite l’interroger.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          <div className="flex rounded-full bg-[#F1EFE6] p-1">
            {[
              { value: "file", label: "Fichier", icon: FileUp },
              { value: "text", label: "Coller un texte", icon: Type },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  mode === value
                    ? "bg-white text-[#16241D] shadow-[0_1px_2px_rgba(22,36,29,0.08)]"
                    : "text-[#5C6B62]",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {mode === "file" ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  importFiles(event.dataTransfer.files);
                }}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors",
                  dragging
                    ? "border-[#2E7D5B] bg-[#EAF2E7]"
                    : "border-[#D8D4C6] bg-white hover:border-[#2E7D5B]/50",
                )}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2E7] text-[#2E7D5B]">
                  <FileUp className="h-5 w-5" />
                </span>
                <span className="mt-3 text-[13px] font-medium text-[#16241D]">
                  Dépose tes fichiers ici
                </span>
                <span className="mt-1 text-[11.5px] text-[#8A968E]">
                  PDF, Word, PowerPoint, texte ou Markdown · 10 fichiers max
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={(event) => {
                  importFiles(event.target.files);
                  event.target.value = "";
                }}
              />

              {queue.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {queue.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-[#E7E4D9] bg-white px-3 py-2 text-[12px]"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-[#5C6B62]" />
                      <span className="min-w-0 flex-1 truncate text-[#3C4A41]">{item.name}</span>
                      {item.status === "working" && (
                        <span className="flex items-center gap-1 text-[10.5px] text-[#A5771F]">
                          <Loader2 className="h-3 w-3 animate-spin" /> Lecture
                        </span>
                      )}
                      {item.status === "done" && <Check className="h-3.5 w-3.5 text-[#2E7D5B]" />}
                      {item.status === "error" && <X className="h-3.5 w-3.5 text-[#B4482F]" />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <form onSubmit={addText} className="mt-4 space-y-3">
              <Input
                value={pasteName}
                onChange={(event) => setPasteName(event.target.value)}
                placeholder="Titre de la source (ex. Notes du cours 3)"
                maxLength={120}
                className="border-[#E2DFD3] bg-white focus-visible:ring-[#2E7D5B]/20"
              />
              <Textarea
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                placeholder="Colle ici le contenu d’un cours, d’une fiche ou d’un exercice…"
                rows={8}
                className="resize-none border-[#E2DFD3] bg-white text-[13px] focus-visible:ring-[#2E7D5B]/20"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!pasteText.trim() || busy}
                  className="rounded-full bg-[#16241D] px-5 text-[#FBFAF6] hover:bg-[#24382D]"
                >
                  {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Ajouter la source
                </Button>
              </div>
            </form>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-[#8A968E]">
            Les fichiers sont stockés de façon privée et restent liés à ton espace.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}