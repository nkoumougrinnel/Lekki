import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ImagePlus, LoaderCircle, Trash2, X, ArrowLeft, ArrowRight } from "lucide-react";
import type { DriveFile } from "@/types/lekki";
import type { Library } from "@/lib/library";
import type { Subject } from "@/lib/curriculum";
import { drive } from "@/lib/api";

interface ScanSubjectDialogProps {
  open: boolean;
  onClose: () => void;
  library: Library;
  workspaceId: string | null;
  folderId: string | null;
  /** Matière pré-choisie (depuis la page d'une matière). */
  defaultSubjectId?: string | null;
  onDone: (file: DriveFile) => void;
}

interface Page {
  id: string;
  blob: Blob;
  url: string;
  kb: number;
}

const KINDS = [
  { value: "Examen", label: "Examen" },
  { value: "RAT", label: "Rattrapage" },
  { value: "CC", label: "Contrôle continu" },
  { value: "TD", label: "TD" },
  { value: "Corrige", label: "Corrigé" },
] as const;

const MAX_SIDE = 2000;

/** Réduit la photo sur le téléphone : une photo de 4 Mo devient ~300 Ko, sans gêner l'OCR. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  return blob && blob.size < file.size ? blob : file;
}

/** Abréviation utilisée dans les noms de fichiers SUP'DOCS (« TS », « AP »…), sinon le titre. */
function shortName(subject: Subject): string {
  const alias = subject.ec.aliases?.find((value) => /^[a-z0-9]{2,6}$/i.test(value));
  return alias ? alias.toUpperCase() : subject.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "_");
}

export function ScanSubjectDialog({
  open, onClose, library, workspaceId, folderId, defaultSubjectId, onDone,
}: ScanSubjectDialogProps) {
  const [pages, setPages] = useState<Page[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [kind, setKind] = useState<string>("Examen");
  const [track, setTrack] = useState<"" | "CL" | "ALT">("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [freeName, setFreeName] = useState("");
  const [busy, setBusy] = useState<"compress" | "upload" | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const subjects = useMemo(
    () => (library.academic ? library.semesters.flatMap((semester) => library.subjectsOfSemester(semester)) : []),
    [library]
  );
  const subject = subjects.find((item) => item.id === subjectId) ?? null;

  useEffect(() => {
    if (!open) return;
    setPages([]);
    setSubjectId(defaultSubjectId ?? "");
    setKind("Examen");
    setTrack("");
    setYear(String(new Date().getFullYear()));
    setFreeName("");
  }, [open, defaultSubjectId]);

  useEffect(() => () => pages.forEach((page) => URL.revokeObjectURL(page.url)), [pages]);

  if (!open) return null;

  const name = subject
    ? [shortName(subject), kind, track, year].filter(Boolean).join("_")
    : freeName.trim() || [kind, track, year].filter(Boolean).join("_");

  const addPhotos = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy("compress");
    try {
      const added: Page[] = [];
      for (const file of Array.from(list).slice(0, 12 - pages.length)) {
        if (!file.type.startsWith("image/")) continue;
        const blob = await compress(file);
        added.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob), kb: Math.round(blob.size / 1024) });
      }
      setPages((current) => [...current, ...added]);
    } finally {
      setBusy(null);
    }
  };

  const move = (index: number, delta: number) =>
    setPages((current) => {
      const next = [...current];
      const [page] = next.splice(index, 1);
      next.splice(index + delta, 0, page);
      return next;
    });

  const submit = async () => {
    if (!pages.length) return;
    setBusy("upload");
    try {
      const file = await drive.scanSubject({
        photos: pages.map((page, index) => new File([page.blob], `page-${index + 1}.jpg`, { type: "image/jpeg" })),
        name,
        workspace_id: workspaceId,
        folder_id: folderId,
      });
      toast.success(`« ${name} » est ajouté. Lekki AI peut déjà le lire.`);
      onDone(file);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible. Vérifie ta connexion.");
    } finally {
      setBusy(null);
    }
  };

  const totalKb = pages.reduce((sum, page) => sum + page.kb, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-title"
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#222731] sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-white/[0.09]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 id="scan-title" className="text-[15px] font-semibold text-zinc-100">Photographier un sujet</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Une photo par page. Lekki en fait un PDF et lit le texte.</p>
          </div>
          <button onClick={onClose} disabled={busy === "upload"} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06]">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { void addPhotos(event.target.files); event.target.value = ""; }} />
          <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void addPhotos(event.target.files); event.target.value = ""; }} />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy !== null || pages.length >= 12}
              className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-sm font-semibold text-zinc-950 active:bg-emerald-400 disabled:opacity-50"
            >
              <Camera className="h-5 w-5" /> {pages.length ? "Page suivante" : "Prendre une photo"}
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={busy !== null || pages.length >= 12}
              className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] text-sm font-medium text-zinc-200 active:bg-white/[0.05] disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" /> Depuis la galerie
            </button>
          </div>

          {busy === "compress" && (
            <p className="flex items-center gap-2 text-xs text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Préparation des photos…</p>
          )}

          {pages.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400">
                {pages.length} page{pages.length > 1 ? "s" : ""} · {totalKb < 1024 ? `${totalKb} Ko` : `${(totalKb / 1024).toFixed(1)} Mo`} à envoyer
              </p>
              <ol className="grid grid-cols-3 gap-2">
                {pages.map((page, index) => (
                  <li key={page.id} className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-black">
                    <img src={page.url} alt={`Page ${index + 1}`} className="aspect-[3/4] w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">{index + 1}</span>
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/80 to-transparent p-1">
                      <button type="button" aria-label="Avancer la page" disabled={index === 0} onClick={() => move(index, -1)} className="flex h-8 w-8 items-center justify-center rounded-md text-white disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button>
                      <button type="button" aria-label="Retirer la page" onClick={() => setPages((current) => current.filter((item) => item.id !== page.id))} className="flex h-8 w-8 items-center justify-center rounded-md text-rose-300"><Trash2 className="h-4 w-4" /></button>
                      <button type="button" aria-label="Reculer la page" disabled={index === pages.length - 1} onClick={() => move(index, 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-white disabled:opacity-30"><ArrowRight className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="space-y-3">
            {subjects.length > 0 ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">Matière</span>
                <select
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  className="h-12 w-full rounded-xl border border-white/[0.1] bg-[#1A2029] px-3 text-zinc-100 outline-none focus:border-emerald-400/60"
                >
                  <option value="">Autre / je l’écris moi-même</option>
                  {library.semesters.map((semester) => (
                    <optgroup key={semester} label={`Semestre ${semester}`}>
                      {library.subjectsOfSemester(semester).map((item) => (
                        <option key={item.id} value={item.id}>{item.title}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            ) : null}
            {!subject && (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">Matière ou titre</span>
                <input
                  value={freeName}
                  onChange={(event) => setFreeName(event.target.value)}
                  placeholder="Ex. TS_Examen_CL_2024"
                  maxLength={120}
                  className="h-12 w-full rounded-xl border border-white/[0.1] bg-[#1A2029] px-3 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-400/60"
                />
              </label>
            )}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">Type</span>
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setKind(item.value)}
                    aria-pressed={kind === item.value}
                    className={`min-h-10 rounded-full border px-3.5 text-sm ${kind === item.value ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-white/[0.1] text-zinc-400"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">Année</span>
                <input
                  value={year}
                  onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  className="h-12 w-full rounded-xl border border-white/[0.1] bg-[#1A2029] px-3 text-zinc-100 outline-none focus:border-emerald-400/60"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">Filière</span>
                <select
                  value={track}
                  onChange={(event) => setTrack(event.target.value as "" | "CL" | "ALT")}
                  className="h-12 w-full rounded-xl border border-white/[0.1] bg-[#1A2029] px-3 text-zinc-100 outline-none focus:border-emerald-400/60"
                >
                  <option value="">Les deux / non précisé</option>
                  <option value="CL">Classique (CL)</option>
                  <option value="ALT">Alternance (ALT)</option>
                </select>
              </label>
            </div>
            <p className="text-[12px] text-zinc-500">
              Nom du fichier : <span className="font-mono text-zinc-300">{name}.pdf</span>
            </p>
          </div>
        </div>

        <footer className="border-t border-white/[0.06] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!pages.length || busy !== null}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-zinc-950 active:bg-emerald-400 disabled:opacity-40"
          >
            {busy === "upload" ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Envoi et lecture du texte…</> : "Ajouter le sujet"}
          </button>
        </footer>
      </section>
    </div>
  );
}
