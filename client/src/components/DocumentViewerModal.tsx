import React from "react";
import { DriveFile, FileExtension } from "@/types/lekki";
import {
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Download,
  BookPlus,
  Share2,
  Calendar,
  Layers,
  User,
} from "lucide-react";

interface DocumentViewerModalProps {
  file: DriveFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAskAIAboutDoc: (file: DriveFile) => void;
  onCreateWikiFromDoc: (file: DriveFile) => void;
  onShareDoc: (file: DriveFile) => void;
}

export function DocumentViewerModal({
  file,
  open,
  onOpenChange,
  onAskAIAboutDoc,
  onCreateWikiFromDoc,
  onShareDoc,
}: DocumentViewerModalProps) {
  if (!open || !file) return null;

  const getDocIcon = (ext: FileExtension) => {
    switch (ext) {
      case "pdf":
        return <FileText className="h-5 w-5 text-rose-400" />;
      case "docx":
        return <FileSpreadsheet className="h-5 w-5 text-sky-400" />;
      case "pptx":
        return <FileText className="h-5 w-5 text-amber-400" />;
      case "md":
      case "txt":
        return <FileCode className="h-5 w-5 text-emerald-400" />;
      default:
        return <FileText className="h-5 w-5 text-zinc-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    const blob = new Blob([file.content || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="doc-viewer-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        id="doc-viewer-modal"
        className="w-full max-w-4xl h-[88vh] bg-[#14171E] border border-zinc-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-zinc-800 bg-[#161A22] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60 shrink-0">
              {getDocIcon(file.extension)}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100 truncate">
                {file.name}
              </h2>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {file.owner_name || "Auteur"}
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {file.page_count ? `${file.page_count} pages` : "Document"} •{" "}
                  {formatFileSize(file.size_bytes)}
                </span>
                <span className="flex items-center gap-1 hidden sm:flex">
                  <Calendar className="h-3 w-3" />
                  {new Date(file.updated_at || file.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Ask Lekki AI button */}
            <button
              onClick={() => {
                onOpenChange(false);
                onAskAIAboutDoc(file);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm"
              title="Poser une question sur ce document"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Interroger avec Lekki AI</span>
            </button>

            {/* Create linked wiki page */}
            <button
              onClick={() => {
                onOpenChange(false);
                onCreateWikiFromDoc(file);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
              title="Structurer une fiche Wiki à partir de cette source"
            >
              <BookPlus className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Créer fiche Wiki</span>
            </button>

            {/* Share */}
            <button
              onClick={() => onShareDoc(file)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-colors"
              title="Partager"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-colors"
              title="Télécharger"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Banner Section 10 Principle */}
        <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>
              <strong>Ressource originale exploitable :</strong> Lekki interroge
              directement ce fichier sans obliger à le convertir en page Wiki.
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Format: {file.extension.toUpperCase()}
          </span>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs text-zinc-300 leading-relaxed bg-[#0E1116]">
          {file.summary && (
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-sans text-zinc-300 space-y-1">
              <div className="font-semibold text-emerald-400 text-[11px] uppercase font-mono">
                Résumé du document
              </div>
              <p>{file.summary}</p>
            </div>
          )}

          <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="text-[11px] font-mono text-zinc-500 border-b border-zinc-800 pb-2">
              ─── CONTENU EXTRACTIBLE ET INDEXÉ PAR LEKKI RAG ───
            </div>
            <div className="whitespace-pre-wrap font-sans text-xs text-zinc-200 leading-relaxed">
              {file.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-[#161A22] flex items-center justify-between text-[11px] text-zinc-500">
          <div>ID: {file.id}</div>
          <div>Dernière modification : {new Date(file.updated_at).toLocaleString("fr-FR")}</div>
        </div>
      </div>
    </div>
  );
}
