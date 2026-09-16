import React from "react";
import { DriveFile, FileExtension, WikiPage } from "@/types/lekki";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  Download,
  BookPlus,
  BookOpen,
  ArrowRight,
  Compass,
  ExternalLink,
} from "lucide-react";

interface DocumentViewerModalProps {
  file: DriveFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAskAIAboutDoc: (file: DriveFile, initialQuestion?: string) => void;
  onCreateWikiFromDoc: (file: DriveFile) => void;
  onShareDoc: (file: DriveFile) => void;
  onOpenWikiPage?: (wikiId: string) => void;
  wikiPages?: WikiPage[];
  activeWorkspaceId?: string | null;
  onSwitchWorkspace: (workspaceId: string) => void;
}

export function DocumentViewerModal({
  file,
  open,
  onOpenChange,
  onAskAIAboutDoc,
  onCreateWikiFromDoc,
  onShareDoc,
  onOpenWikiPage,
  wikiPages = [],
  activeWorkspaceId,
  onSwitchWorkspace,
}: DocumentViewerModalProps) {
  const { workspaces } = useWorkspace();
  if (!open || !file) return null;

  const getDocIcon = (ext: FileExtension) => {
    switch (ext) {
      case "pdf":
        return <FileText className="h-6 w-6 text-rose-400" />;
      case "docx":
        return <FileSpreadsheet className="h-6 w-6 text-sky-400" />;
      case "pptx":
        return <FileText className="h-6 w-6 text-amber-400" />;
      case "md":
      case "txt":
        return <FileCode className="h-6 w-6 text-emerald-400" />;
      default:
        return <FileText className="h-6 w-6 text-zinc-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    const downloadUrl = `/api/v1/drive/files/${file.id}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", file.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const linkedWikiList = (file.linked_wiki_ids || [])
    .map((wikiId) => wikiPages.find((p) => p.id === wikiId))
    .filter((p): p is WikiPage => Boolean(p));

  const totalPages = file.page_count || 1;
  const chapters = file.detected_chapters || [];

  // Check if document belongs to the active workspace
  const isDifferentWorkspace = file.workspace_id && file.workspace_id !== activeWorkspaceId;
  const fileWorkspace = workspaces.find(w => w.id === file.workspace_id);
  const fileWorkspaceName = fileWorkspace?.name || "un workspace inconnu";

  return (
    <div
      id="doc-viewer-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        id="doc-index-card-modal"
        className="w-full max-w-3xl max-h-[90vh] bg-[#12151B] border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-[#161A22] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Fiche Documentaire
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Workspace Switch Suggestion */}
          {isDifferentWorkspace && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-xs text-amber-200/80">
                <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                <span>Ce document appartient au workspace <span className="font-bold text-amber-400">{fileWorkspaceName}</span>.</span>
              </div>
              <button
                onClick={() => {
                  if (file.workspace_id) onSwitchWorkspace(file.workspace_id);
                }}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4"
              >
                Basculer vers ce workspace
              </button>
            </div>
          )}

          {/* 1. Main Resource Presentation Card */}
          <div className="p-5 rounded-2xl bg-[#161A23] border border-zinc-800/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0 shadow-inner">
                {getDocIcon(file.extension)}
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="text-base sm:text-lg font-semibold text-zinc-100 leading-snug break-words">
                  {file.name}
                </h2>
                <div className="flex items-center gap-2.5 text-xs text-zinc-400 flex-wrap font-mono">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold uppercase text-[10px]">
                    {file.extension.toUpperCase()}
                  </span>
                  <span>•</span>
                  <span>{totalPages} {totalPages > 1 ? "pages" : "page"}</span>
                  <span>•</span>
                  <span className="text-zinc-400">{file.owner_name || "Auteur"}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <button
                onClick={handleDownload}
                className="p-2.5 rounded-xl text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all shadow-sm active:scale-95 border border-emerald-500/20"
                title={`Télécharger l'original (${formatFileSize(file.size_bytes)})`}
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 2. Sommaire & Chapitres Détectés */}
          {chapters.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#161A23] border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                  <Compass className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Chapitres & Structure détectés ({chapters.length})</span>
                </div>
              </div>

              <div className="divide-y divide-zinc-800/60 pt-1">
                {chapters.map((ch) => (
                  <div
                    key={ch.number}
                    className="py-3 flex items-center justify-between gap-3 group hover:bg-zinc-900/40 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                        {ch.number}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-zinc-200 truncate">
                          {ch.title}
                        </div>
                        {ch.subtopics && ch.subtopics.length > 0 && (
                          <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {ch.subtopics.join(" • ")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        p. {ch.page}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Connaissances Wiki Associées */}
          <div className="p-5 rounded-2xl bg-[#161A23] border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Fiches Wiki associées dans le Workspace</span>
              </div>
              <button
                onClick={() => {
                  onOpenChange(false);
                  onCreateWikiFromDoc(file);
                }}
                disabled={isDifferentWorkspace}
                className={`inline-flex items-center gap-1 text-[11px] transition-colors ${
                  isDifferentWorkspace
                    ? "text-zinc-600 cursor-not-allowed"
                    : "text-zinc-400 hover:text-emerald-400"
                }`}
                title={isDifferentWorkspace ? "Basculez vers le workspace du document pour créer une fiche" : ""}
              >
                <BookPlus className="h-3.5 w-3.5" />
                <span>Rédiger une fiche</span>
              </button>
            </div>

            {linkedWikiList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {linkedWikiList.map((wPage) => (
                  <div
                    key={wPage.id}
                    onClick={() => {
                      onOpenChange(false);
                      onOpenWikiPage?.(wPage.id);
                    }}
                    className="p-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center justify-between gap-3 group shadow-sm"
                  >
                    <div className="min-w-0">
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 truncate">
                        {wPage.title}
                      </div>
                      {wPage.workspace_id && wPage.workspace_id !== activeWorkspaceId && (
                        <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-emerald-500 text-zinc-950 border border-emerald-400 text-[9px] font-bold shrink-0 shadow-sm" title={`Provenance : ${workspaces.find(w => w.id === wPage.workspace_id)?.name || "Workspace externe"}`}>
                          <ExternalLink className="h-2.5 w-2.5" />
                          <span className="hidden sm:inline">{workspaces.find(w => w.id === wPage.workspace_id)?.name || "Ext"}</span>
                          <span className="sm:hidden">Ext</span>
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                      <span className="text-emerald-400">
                        {wPage.status === "verified" ? "● Vérifiée" : "● Communautaire"}
                      </span>
                      <span>•</span>
                      <span>{wPage.topic || "Général"}</span>
                    </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-2">
                <p className="text-xs text-zinc-400">
                  Aucune fiche Wiki n'a encore synthétisé ce document.
                </p>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    onCreateWikiFromDoc(file);
                  }}
                  disabled={isDifferentWorkspace}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isDifferentWorkspace
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700"
                      : "bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-emerald-500/30"
                  }`}
                  title={isDifferentWorkspace ? "Basculez vers le workspace du document pour créer une fiche" : ""}
                >
                  <BookPlus className="h-3.5 w-3.5" />
                  <span>Créer la première fiche Wiki pour ce document</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
