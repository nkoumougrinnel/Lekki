import React, { useEffect, useMemo, useState } from "react";
import { DriveFile, WikiPage } from "@/types/lekki";
import { apiUrl } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DocumentTypeIcon } from "./DocumentTypeIcon";
import {
  X,
  Download,
  BookPlus,
  BookOpen,
  ArrowRight,
  Compass,
  ExternalLink,
  ImageOff,
  ChevronDown,
  ChevronUp,
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

const THUMBNAIL_ROUTE = (fileId: string) =>
  apiUrl(`/drive/files/${fileId}/thumbnail`);

export function DocumentViewerModal({
  file,
  open,
  onOpenChange,
  onCreateWikiFromDoc,
  onOpenWikiPage,
  wikiPages = [],
  activeWorkspaceId,
  onSwitchWorkspace,
}: DocumentViewerModalProps) {
  const { workspaces } = useWorkspace();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [showAllChapters, setShowAllChapters] = useState(false);

  useEffect(() => {
    setThumbnailFailed(false);
    setShowAllChapters(false);
  }, [file?.id, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const formatFileSize = (bytes?: number | null) => {
    if (bytes == null || bytes <= 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const linkedWikiList = useMemo(() => {
    if (!file) return [];
    return (file.linked_wiki_ids || [])
      .map((wikiId) => wikiPages.find((page) => page.id === wikiId))
      .filter((page): page is WikiPage => Boolean(page));
  }, [file, wikiPages]);

  if (!open || !file) return null;

  const extension = (file.extension || "").toLowerCase().replace(/^\./, "");
  const isPdf = extension === "pdf";
  const isOfficeDocument = extension === "docx" || extension === "pptx";
  const totalPages = file.page_count;
  const totalSlides = file.slide_count;
  const chapters = file.detected_chapters || [];
  const fileWorkspace = workspaces.find((workspace) => workspace.id === file.workspace_id);
  const hasKnownWorkspace = Boolean(file.workspace_id && fileWorkspace);
  const isDifferentWorkspace = Boolean(
    hasKnownWorkspace && file.workspace_id !== activeWorkspaceId,
  );
  const canUseWiki = hasKnownWorkspace && !isDifferentWorkspace;
  const visibleChapters = showAllChapters ? chapters : chapters.slice(0, 7);
  const fileSize = formatFileSize(file.size_bytes);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = apiUrl(`/drive/files/${file.id}/download`);
    link.setAttribute("download", file.name);
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCreateWiki = () => {
    if (!canUseWiki) return;
    onOpenChange(false);
    onCreateWikiFromDoc(file);
  };

  return (
    <div
      id="doc-viewer-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <section
        id="doc-index-card-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-viewer-title"
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#11141a] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* En-tête fixe */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-3.5 sm:px-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Fiche documentaire
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer la fiche documentaire"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {/* Changement de workspace uniquement si le workspace est connu */}
          {isDifferentWorkspace && fileWorkspace && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2.5 text-sm text-zinc-300">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>
                  Ce document appartient au workspace{" "}
                  <strong className="font-medium text-amber-200">{fileWorkspace.name}</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => file.workspace_id && onSwitchWorkspace(file.workspace_id)}
                className="shrink-0 self-start text-xs font-medium text-amber-200 transition hover:text-amber-100 sm:self-auto"
              >
                Basculer vers ce workspace <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {/* Identité du document : volontairement compacte */}
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.045] ring-1 ring-white/[0.07] sm:h-14 sm:w-14">
              <DocumentTypeIcon extension={file.extension} className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="document-viewer-title"
                title={file.name}
                className="break-words text-base font-semibold leading-snug text-zinc-100 sm:text-lg"
              >
                {file.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-semibold uppercase tracking-wide text-zinc-300">
                  {extension || "Fichier"}
                </span>
                {isPdf && totalPages != null && <span>{totalPages} {totalPages === 1 ? "page" : "pages"}</span>}
                {extension === "pptx" && totalSlides != null && (
                  <span>{totalSlides} {totalSlides === 1 ? "diapositive" : "diapositives"}</span>
                )}
                {extension === "docx" && totalPages != null && (
                  <span>{totalPages} {totalPages === 1 ? "page" : "pages"} estimées par Word</span>
                )}
                {fileSize && <span>{fileSize}</span>}
                {file.owner_name && <span>Par {file.owner_name}</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.09] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white"
              title="Télécharger le document original"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Télécharger</span>
            </button>
          </div>

          {/* L'aperçu agrandit la même vignette que celle de la liste */}
          <section aria-labelledby="document-preview-heading">
            <div className="mb-3 flex items-center justify-between">
              <h3 id="document-preview-heading" className="text-sm font-medium text-zinc-200">
                Aperçu du document
              </h3>
              <span className="text-[11px] text-zinc-600">Première page</span>
            </div>
            <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl bg-[#1a1e26] p-3 sm:min-h-[340px] sm:p-5">
              {!thumbnailFailed ? (
                <img
                  key={file.id}
                  src={THUMBNAIL_ROUTE(file.id)}
                  alt={`Première page de ${file.name}`}
                  onError={() => setThumbnailFailed(true)}
                  className="max-h-[62vh] max-w-full rounded-sm object-contain shadow-[0_8px_36px_rgba(0,0,0,0.35)]"
                  loading="eager"
                />
              ) : (
                <div className="flex max-w-sm flex-col items-center px-5 py-10 text-center">
                  <div className="mb-3 rounded-xl bg-white/[0.04] p-3 text-zinc-500">
                    <ImageOff className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-zinc-300">Aperçu indisponible</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                    La vignette de ce document n'a pas pu être chargée. Vous pouvez tout de même télécharger le fichier original.
                  </p>
                  <button
                    type="button"
                    onClick={() => setThumbnailFailed(false)}
                    className="mt-3 text-xs font-medium text-sky-300 transition hover:text-sky-200"
                  >
                    Réessayer
                  </button>
                </div>
              )}
            </div>
            {isOfficeDocument && (
              <p className="mt-2 text-[11px] text-zinc-600">
                Aperçu de la première {extension === "pptx" ? "diapositive" : "page"} · la mise en page peut différer du document original.
              </p>
            )}
          </section>

          {/* Structure détectée : titres limités visuellement, contenu complet au survol */}
          {chapters.length > 0 && (
            <section aria-labelledby="document-structure-heading">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Compass className="h-4 w-4 shrink-0 text-sky-300" />
                  <h3 id="document-structure-heading" className="text-sm font-medium text-zinc-200">
                    Structure détectée
                  </h3>
                  <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-zinc-500">
                    {chapters.length}
                  </span>
                </div>
                {chapters.length > 7 && (
                  <button
                    type="button"
                    onClick={() => setShowAllChapters((current) => !current)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-zinc-400 transition hover:text-zinc-200"
                  >
                    {showAllChapters ? "Réduire" : "Tout afficher"}
                    {showAllChapters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-white/[0.07] divide-y divide-white/[0.055]">
                {visibleChapters.map((chapter, index) => (
                  <div
                    key={`${chapter.number}-${chapter.title}-${index}`}
                    className="flex min-w-0 items-center gap-3 px-3 py-3 transition hover:bg-white/[0.025] sm:px-4"
                  >
                    <span className="w-7 shrink-0 text-[11px] font-medium tabular-nums text-zinc-500">
                      {String(chapter.number ?? index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p title={chapter.title} className="truncate text-xs font-medium text-zinc-200 sm:text-sm">
                        {chapter.title}
                      </p>
                      {(chapter.subtopics?.length ?? 0) > 0 && (
                        <p
                          title={chapter.subtopics?.join(" · ") ?? ""}
                          className="mt-1 truncate text-[11px] text-zinc-600"
                        >
                          {(chapter.subtopics ?? []).slice(0, 3).join(" · ")}
                          {(chapter.subtopics ?? []).length > 3 ? " …" : ""}
                        </p>
                      )}
                    </div>
                    {(chapter.location || chapter.page != null) && (
                      <span className="shrink-0 rounded-md bg-white/[0.045] px-2 py-1 text-[10px] tabular-nums text-zinc-500">
                        {chapter.location || `p. ${chapter.page}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Wiki : entièrement masqué si le document n'appartient pas à un workspace connu */}
          {hasKnownWorkspace && (
            <section aria-labelledby="associated-wiki-heading">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-sky-300" />
                  <h3 id="associated-wiki-heading" className="text-sm font-medium text-zinc-200">
                    Fiches Wiki associées
                  </h3>
                  {linkedWikiList.length > 0 && (
                    <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-zinc-500">
                      {linkedWikiList.length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCreateWiki}
                  disabled={!canUseWiki}
                  title={isDifferentWorkspace ? "Basculez d'abord vers le workspace du document" : undefined}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-300/[0.08] hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <BookPlus className="h-3.5 w-3.5" />
                  Créer une fiche
                </button>
              </div>

              {linkedWikiList.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-white/[0.07] divide-y divide-white/[0.055]">
                  {linkedWikiList.map((wikiPage) => (
                    <button
                      key={wikiPage.id}
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenWikiPage?.(wikiPage.id);
                      }}
                      className="group flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white/[0.035] sm:px-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p title={wikiPage.title} className="truncate text-sm font-medium text-zinc-200 transition group-hover:text-sky-200">
                          {wikiPage.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
                          <span className={wikiPage.status === "verified" ? "text-sky-300" : "text-zinc-500"}>
                            {wikiPage.status === "verified" ? "Vérifiée" : "Communautaire"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{wikiPage.topic || "Général"}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-sky-300" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.09] px-4 py-5 text-center">
                  <p className="text-xs text-zinc-500">Aucune fiche Wiki n'est encore associée à ce document.</p>
                  <button
                    type="button"
                    onClick={handleCreateWiki}
                    disabled={!canUseWiki}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-300/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <BookPlus className="h-3.5 w-3.5" />
                    Créer la première fiche
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
