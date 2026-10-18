import React, { useEffect, useRef, useState } from "react";
import { DriveFolder, FileExtension, DriveFile } from "@/types/lekki";
import { ApiError, drive } from "@/lib/api";
import { DocumentTypeIcon } from "./DocumentTypeIcon";
import { toast } from "sonner";
import {
  UploadCloud,
  FilePlus,
  X,
  CheckCircle2,
  Folder,
  ArrowRight,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";

interface NewFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: DriveFolder[];
  defaultWorkspaceId?: string | null;
  defaultFolderId?: string | null;
  onFileCreated: (file: DriveFile) => void | Promise<void>;
}

const SUPPORTED_EXTENSIONS = ["pdf", "docx", "pptx", "txt", "md"];

function getExtension(filename: string): FileExtension | null {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext && SUPPORTED_EXTENSIONS.includes(ext)) {
    return ext as FileExtension;
  }

  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} octets`;

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} Ko`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function NewFileDialog({
  open,
  onOpenChange,
  folders,
  defaultWorkspaceId,
  defaultFolderId,
  onFileCreated,
}: NewFileDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [createdFile, setCreatedFile] = useState<DriveFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [creating, setCreating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setSelectedFile(null);
    setCreatedFile(null);
    setIsDragOver(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [open, defaultFolderId]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating) {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, creating, onOpenChange]);

  if (!open) return null;

  const handleClose = () => {
    if (creating) return;
    onOpenChange(false);
  };

  const handleSelectFile = (file?: File) => {
    if (!file || creating) return;

    const ext = getExtension(file.name);

    if (!ext) {
      toast.error(
        "Format non pris en charge. Utilisez PDF, DOCX, PPTX, TXT ou MD."
      );
      return;
    }

    setSelectedFile(file);
    setCreatedFile(null);
    setIsDragOver(false);
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    if (creating) return;

    handleSelectFile(event.dataTransfer.files?.[0]);
  };

  const handleManualFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleSelectFile(event.target.files?.[0]);

    // Autorise la sélection successive du même fichier.
    event.target.value = "";
  };

  const handleRemoveFile = () => {
    if (creating) return;

    setSelectedFile(null);
    setCreatedFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile || creating || createdFile) return;

    if (!getExtension(selectedFile.name)) {
      toast.error("Le format de ce fichier n'est pas pris en charge.");
      return;
    }

    setCreating(true);

    try {
      const newFile = await drive.createFile({
        file: selectedFile,
        workspace_id: defaultWorkspaceId || null,
        folder_id: defaultFolderId || null,
      });

      setCreatedFile(newFile);
      await onFileCreated(newFile);

      toast.success(`Document « ${newFile.name} » ajouté au Drive.`);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Erreur lors de l'ajout du document."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleAddAnother = () => {
    setSelectedFile(null);
    setCreatedFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const extension = selectedFile
    ? getExtension(selectedFile.name) || "pdf"
    : "pdf";

  const detectedChapters = createdFile?.detected_chapters;
  const indexedChapters = createdFile?.index_meta?.chapters_detected;

  const pageCount = createdFile?.page_count;
  const slideCount = createdFile?.slide_count;

  const destination = defaultFolderId
    ? folders.find((folder) => folder.id === defaultFolderId)?.name ||
      "Dossier courant"
    : "Racine du Drive";

  return (
    <div
      id="new-file-dialog-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <section
        id="new-file-dialog-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-file-dialog-title"
        className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#12161d] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* EN-TÊTE */}

        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10">
              {createdFile ? (
                <CheckCircle2 className="h-[18px] w-[18px] text-sky-300" />
              ) : (
                <FilePlus className="h-[18px] w-[18px] text-sky-300" />
              )}
            </div>

            <div>
              <h2
                id="new-file-dialog-title"
                className="text-sm font-semibold text-zinc-100"
              >
                {createdFile ? "Document ajouté" : "Ajouter un document"}
              </h2>

              <p className="mt-0.5 text-[11px] text-zinc-500">
                {createdFile
                  ? "Le document a été déposé dans votre Drive."
                  : "Ajoutez une ressource à votre espace de travail."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={creating}
            aria-label="Fermer"
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* CONTENU */}

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            {/* ZONE DE DÉPÔT */}

            {!selectedFile && !createdFile && (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!creating) setIsDragOver(true);
                }}
                onDragLeave={(event) => {
                  const nextTarget = event.relatedTarget;

                  if (
                    !(nextTarget instanceof Node) ||
                    !event.currentTarget.contains(nextTarget)
                  ) {
                    setIsDragOver(false);
                  }
                }}
                onDrop={handleFileDrop}
                className={`flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
                  isDragOver
                    ? "border-sky-400 bg-sky-400/[0.07]"
                    : "border-white/[0.12] bg-white/[0.015] hover:border-white/[0.2]"
                }`}
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                    isDragOver
                      ? "bg-sky-400/15 text-sky-300"
                      : "bg-white/[0.05] text-zinc-400"
                  }`}
                >
                  <UploadCloud className="h-6 w-6" />
                </div>

                <p className="text-sm font-medium text-zinc-200">
                  {isDragOver
                    ? "Déposez votre fichier ici"
                    : "Glissez votre document ici"}
                </p>

                <p className="mt-1.5 text-xs text-zinc-500">
                  ou sélectionnez-le depuis votre ordinateur
                </p>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
                >
                  Parcourir les fichiers
                </button>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.md"
                  className="hidden"
                  onChange={handleManualFileSelect}
                />

                <p className="mt-5 text-[10px] text-zinc-600">
                  PDF, DOCX, PPTX, TXT, MD
                </p>
              </div>
            )}

            {/* FICHIER SÉLECTIONNÉ */}

            {selectedFile && !createdFile && (
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-xs font-medium text-zinc-400">
                    Document sélectionné
                  </p>

                  <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-400/10">
                      <DocumentTypeIcon extension={extension} className="h-7 w-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        title={selectedFile.name}
                        className="truncate text-sm font-medium text-zinc-100"
                      >
                        {selectedFile.name}
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        {extension.toUpperCase()} ·{" "}
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      disabled={creating}
                      title="Retirer ce fichier"
                      aria-label="Retirer ce fichier"
                      className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] px-3.5 py-3">
                  <div className="flex items-center gap-3">
                    <Folder className="h-4 w-4 shrink-0 text-zinc-500" />

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-zinc-500">
                        Destination
                      </p>

                      <p className="mt-0.5 truncate text-xs font-medium text-zinc-200">
                        {destination}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Votre document sera ajouté au Drive. Les informations
                  disponibles sur sa structure seront présentées après le
                  dépôt.
                </p>
              </div>
            )}

            {/* RÉSULTAT DU DÉPÔT ET STRUCTURE DÉTECTÉE */}

            {createdFile && (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-xl border border-sky-400/15 bg-sky-400/[0.045] p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-400/10">
                    <CheckCircle2 className="h-5 w-5 text-sky-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-100">
                      Dépôt réussi
                    </p>

                    <p className="mt-1 break-words text-xs leading-relaxed text-zinc-400">
                      {createdFile.name}
                    </p>

                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <Folder className="h-3 w-3" />
                      {destination}
                    </p>
                  </div>
                </div>

                {/* INFORMATIONS SUR LE DOCUMENT */}

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-medium text-zinc-300">
                      Structure du document
                    </h3>

                    {createdFile.index_meta?.total_chunks != null && (
                      <span className="shrink-0 rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-zinc-500">
                        {createdFile.index_meta.total_chunks} passage
                        {createdFile.index_meta.total_chunks > 1 ? "s" : ""}{" "}
                        indexé
                        {createdFile.index_meta.total_chunks > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
                    {createdFile.extension === "pdf" &&
                    pageCount != null
                      ? `${pageCount} page${pageCount === 1 ? "" : "s"} détectée${pageCount === 1 ? "" : "s"}.`
                      : createdFile.extension === "pptx" &&
                          slideCount != null
                        ? `${slideCount} diapositive${slideCount === 1 ? "" : "s"} détectée${slideCount === 1 ? "" : "s"}.`
                        : createdFile.extension === "docx"
                          ? pageCount != null
                            ? `${pageCount} page${pageCount === 1 ? "" : "s"} selon les propriétés Word. La pagination peut varier selon la mise en page.`
                            : "La pagination Word dépend de la mise en page et n'est pas fournie par le fichier."
                          : "Voici les informations structurelles disponibles pour ce document."}
                  </p>

                  {/* Chapitres détectés : nouveau format prioritaire */}

                  {detectedChapters && detectedChapters.length > 0 ? (
                    <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-white/[0.07] p-3">
                      {detectedChapters.slice(0, 12).map((chapter, index) => (
                        <div
                          key={`${chapter.number}-${chapter.title}`}
                          className="flex items-start gap-3 py-1.5"
                        >
                          <span className="mt-0.5 shrink-0 text-[10px] text-zinc-600">
                            {chapter.number || String(index + 1).padStart(2, "0")}
                          </span>

                          <span className="min-w-0 flex-1 break-words text-xs leading-relaxed text-zinc-400">
                            {chapter.title}
                          </span>

                          {chapter.location && (
                            <span className="shrink-0 text-[10px] text-zinc-600">
                              {chapter.location}
                            </span>
                          )}
                        </div>
                      ))}

                      {detectedChapters.length > 12 && (
                        <p className="pt-2 text-[10px] text-zinc-600">
                          + {detectedChapters.length - 12} autres sections
                        </p>
                      )}
                    </div>
                  ) : indexedChapters && indexedChapters.length > 0 ? (
                    /* Compatibilité avec l'ancien format */

                    <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-white/[0.07] p-3">
                      {indexedChapters.slice(0, 12).map((chapter, index) => (
                        <div
                          key={`${chapter}-${index}`}
                          className="flex items-start gap-2.5 py-1.5"
                        >
                          <span className="mt-0.5 text-[10px] text-zinc-600">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <span className="break-words text-xs leading-relaxed text-zinc-400">
                            {chapter}
                          </span>
                        </div>
                      ))}

                      {indexedChapters.length > 12 && (
                        <p className="pt-2 text-[10px] text-zinc-600">
                          + {indexedChapters.length - 12} autres sections
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-white/[0.07] px-3.5 py-3 text-xs leading-relaxed text-zinc-500">
                      Aucun chapitre n'a été détecté dans les informations
                      retournées par le serveur.
                    </p>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* ACTIONS */}

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] bg-white/[0.015] px-5 py-3.5">
            <div>
              {!createdFile && selectedFile && (
                <button
                  type="button"
                  onClick={handleAddAnother}
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-30"
                >
                  <RotateCcw className="h-3 w-3" />
                  Changer de fichier
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!createdFile && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={creating}
                  className="rounded-lg px-3.5 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 disabled:opacity-30"
                >
                  Annuler
                </button>
              )}

              {createdFile ? (
                <>
                  <button
                    type="button"
                    onClick={handleAddAnother}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.05]"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                    Ajouter un autre
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-400 px-4 py-2 text-xs font-semibold text-[#101318] transition-colors hover:bg-sky-300"
                  >
                    Terminer
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={!selectedFile || creating}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-400 px-4 py-2 text-xs font-semibold text-[#101318] transition-colors hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {creating ? (
                    <>
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      Dépôt en cours…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5" />
                      Déposer le document
                    </>
                  )}
                </button>
              )}
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}