import React, { useState } from "react";
import { DriveFolder, FileExtension, DriveFile } from "@/types/lekki";
import { drive } from "@/lib/api";
import { toast } from "sonner";
import {
  UploadCloud,
  FilePlus,
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";

interface NewFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: DriveFolder[];
  defaultWorkspaceId?: string | null;
  defaultFolderId?: string | null;
  onFileCreated: (file: DriveFile) => void;
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
  const [extension, setExtension] = useState<FileExtension>("pdf");
  const [createdFile, setCreatedFile] = useState<DriveFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [creating, setCreating] = useState(false);

  React.useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setCreatedFile(null);
    }
  }, [open, defaultFolderId]);

  if (!open) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    setSelectedFile(droppedFile);
    const ext = droppedFile.name.split(".").pop()?.toLowerCase();
    if (["pdf", "docx", "pptx", "txt", "md"].includes(ext || "")) {
      setExtension(ext as FileExtension);
    }

  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setSelectedFile(selected);
    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (["pdf", "docx", "pptx", "txt", "md"].includes(ext || "")) {
      setExtension(ext as FileExtension);
    }

  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Sélectionnez un document à déposer");
      return;
    }

    setCreating(true);
    try {
      const newFile = await drive.createFile({
        file: selectedFile,
        workspace_id: defaultWorkspaceId || null,
        folder_id: defaultFolderId || null,
      });

      toast.success(`Document « ${newFile.name} » ajouté`);
      setCreatedFile(newFile);
      onFileCreated(newFile);
    } catch {
      toast.error("Erreur lors de l'ajout du document");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      id="new-file-dialog-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        id="new-file-dialog-modal"
        className="w-full max-w-lg bg-[#161A22] border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilePlus className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Ajouter un document au Drive
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {!selectedFile && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
              isDragOver
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/40"
            }`}
          >
            <UploadCloud className="h-8 w-8 mx-auto text-emerald-400 mb-2 opacity-80" />
            <div className="text-xs text-zinc-300 font-medium">
              Glissez-déposez votre fichier ici (PDF, DOCX, PPTX, TXT, MD)
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              ou sélectionnez-le depuis votre ordinateur
            </div>
            <label className="inline-block mt-3 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer border border-zinc-700">
              Parcourir les fichiers
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.pptx,.txt,.md"
                onChange={handleManualFileSelect}
              />
            </label>
          </div>
          )}

          {selectedFile && (
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-[#11161D] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <FileText className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-100">{selectedFile.name}</div>
                  <div className="text-[11px] text-zinc-500">{extension.toUpperCase()} · {Math.max(1, Math.round(selectedFile.size / 1024))} KB</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-zinc-300">
                <div><span className="text-zinc-500">Dépôt</span><div className="font-medium text-zinc-100">{defaultFolderId ? "Dossier courant" : "Racine"}</div></div>
                <div><span className="text-zinc-500">Statut</span><div className="font-medium text-amber-300">Prêt à déposer</div></div>
              </div>
              {createdFile && <div className="border-t border-emerald-500/15 pt-3">
                <div className="mb-2 text-xs font-semibold text-zinc-200">Structure détectée</div>
                {createdFile.index_meta?.chapters_detected?.length ? (
                  <ul className="space-y-1 text-xs text-zinc-400">
                    {createdFile.index_meta.chapters_detected.map((chapter) => <li key={chapter}>• {chapter}</li>)}
                  </ul>
                ) : <div className="text-xs text-zinc-500">Aucun chapitre détecté.</div>}
                <div className="mt-2 text-[11px] text-zinc-500">{createdFile.index_meta?.total_chunks || 0} passage(s) indexé(s)</div>
              </div>}
            </div>
          )}

          <div className="p-3 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-end gap-2 -mx-4 -mb-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type={createdFile ? "button" : "submit"}
              onClick={createdFile ? () => onOpenChange(false) : undefined}
              disabled={creating}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors disabled:opacity-50"
            >
              {creating ? "Dépôt en cours..." : createdFile ? "OK" : "OK"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
