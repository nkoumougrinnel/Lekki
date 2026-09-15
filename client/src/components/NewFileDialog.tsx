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
  const [name, setName] = useState("");
  const [extension, setExtension] = useState<FileExtension>("pdf");
  const [folderId, setFolderId] = useState<string>(defaultFolderId || "");
  const [content, setContent] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [creating, setCreating] = useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setContent("");
      setFolderId(defaultFolderId || "");
    }
  }, [open, defaultFolderId]);

  if (!open) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    setName(droppedFile.name);
    const ext = droppedFile.name.split(".").pop()?.toLowerCase();
    if (["pdf", "docx", "pptx", "txt", "md"].includes(ext || "")) {
      setExtension(ext as FileExtension);
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setContent(text || `Fichier ${droppedFile.name} importé avec succès.`);
    };
    reader.readAsText(droppedFile);
  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setName(selected.name);
    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (["pdf", "docx", "pptx", "txt", "md"].includes(ext || "")) {
      setExtension(ext as FileExtension);
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setContent(text || `Fichier ${selected.name} importé avec succès.`);
    };
    reader.readAsText(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Veuillez saisir un nom pour le document");
      return;
    }

    setCreating(true);
    try {
      const finalName = name.includes(".") ? name : `${name}.${extension}`;
      const newFile = await drive.createFile({
        name: finalName,
        extension,
        content: content || `# ${finalName}\n\nDocument ajouté le ${new Date().toLocaleDateString("fr-FR")}.`,
        workspace_id: defaultWorkspaceId || null,
        folder_id: folderId || null,
      });

      toast.success(`Document « ${newFile.name} » ajouté`);
      onFileCreated(newFile);
      onOpenChange(false);
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
          {/* Drag & Drop Area */}
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

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Nom du document
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Cours Réseaux — Routage.pdf"
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Format
                </label>
                <select
                  value={extension}
                  onChange={(e) => setExtension(e.target.value as FileExtension)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="pdf">PDF (Cours, TD, Livre)</option>
                  <option value="docx">DOCX (Rapport, Cahier)</option>
                  <option value="pptx">PPTX (Présentation)</option>
                  <option value="md">Markdown (.md)</option>
                  <option value="txt">Texte brut (.txt)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Dossier de destination
                </label>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Racine (Sans dossier)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Contenu textuel (analysé par Lekki AI)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Collez ou rédigez ici le contenu du document pour indexation..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="p-3 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-end gap-2 -mx-4 -mb-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors disabled:opacity-50"
            >
              {creating ? "Ajout en cours..." : "Enregistrer le document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
