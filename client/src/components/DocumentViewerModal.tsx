import React, { useEffect, useMemo, useState } from "react";
import { DriveFile, WikiPage } from "@/types/lekki";
import { fileUrl } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DocumentTypeIcon } from "./DocumentTypeIcon";
import { StudentDocBadge } from "./StudentDocBadge";
import { classifyFile, prettyName } from "@/lib/studentDocs";
import { shareDocument } from "@/lib/share";
import { isAvailableOffline, keepOffline } from "@/lib/offline";
import { toast } from "sonner";
import {
  X,
  Download,
  Share2,
  CheckCircle2 as CloudCheck,
  CloudDownload,
  LoaderCircle,
  BookPlus,
  BookOpen,
  BookOpenText,
  GraduationCap,
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
  /** Lance un quiz (cours, TD) ou une correction (ancien sujet) sur ce document. */
  onRevise?: (file: DriveFile) => void;
  /** Matière du programme à laquelle le document est rattaché. */
  subjectTitle?: string;
}

const THUMBNAIL_ROUTE = (fileId: string) =>
  fileUrl(`/drive/files/${fileId}/thumbnail`);

export function DocumentViewerModal({
  file,
  open,
  onOpenChange,
  onCreateWikiFromDoc,
  onOpenWikiPage,
  wikiPages = [],
  activeWorkspaceId,
  onSwitchWorkspace,
  onRevise,
  subjectTitle,
}: DocumentViewerModalProps) {
  const { workspaces } = useWorkspace();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [showAllChapters, setShowAllChapters] = useState(false);

  const [offline, setOffline] = useState<"unknown" | "no" | "saving" | "yes">("unknown");

  useEffect(() => {
    setThumbnailFailed(false);
    setShowAllChapters(false);
    setOffline("unknown");
    if (open && file?.id) {
      void isAvailableOffline(file.id).then((available) => setOffline(available ? "yes" : "no"));
    }
  }, [file?.id, open]);

  const saveOffline = async () => {
    if (!file) return;
    setOffline("saving");
    try {
      await keepOffline(file.id);
      setOffline("yes");
      toast.success("Gardé sur ton téléphone : tu pourras le lire sans réseau.");
    } catch (error) {
      setOffline("no");
      toast.error(error instanceof Error ? error.message : "Impossible de garder ce document hors ligne.");
    }
  };

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
  const docInfo = classifyFile(file);
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
    link.href = fileUrl(`/drive/files/${file.id}/download`);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <section
        id="doc-index-card-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-viewer-title"
        className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:h-auto sm:max-h-[94vh] sm:rounded-2xl sm:border sm:border-[#E7E4D9]"
      >
        {/* En-tête fixe */}
        <header className="flex shrink-0 items-center justify-between border-b border-[#E7E4D9] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
            Document
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer la fiche documentaire"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-[#F8F7F2] hover:text-[#16241D]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {/* Changement d’espace uniquement si l’espace est connu */}
          {isDifferentWorkspace && fileWorkspace && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2.5 text-sm text-body">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  Ce document appartient à l’espace{" "}
                  <strong className="font-medium text-amber-700">{fileWorkspace.name}</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => file.workspace_id && onSwitchWorkspace(file.workspace_id)}
                className="shrink-0 self-start text-xs font-medium text-amber-700 transition hover:text-amber-700 sm:self-auto"
              >
                Basculer vers cet espace <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {/* Identité du document : volontairement compacte */}
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F8F7F2] ring-1 ring-black/[0.07] sm:h-14 sm:w-14">
              <DocumentTypeIcon extension={file.extension} className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="document-viewer-title"
                title={file.name}
                className="break-words text-base font-semibold leading-snug text-heading sm:text-lg"
              >
                {prettyName(file.name)}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
                <span className="rounded-md bg-[#F8F7F2] px-1.5 py-0.5 font-semibold uppercase tracking-wide text-body">
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
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <StudentDocBadge info={docInfo} />
                {subjectTitle && (
                  <span className="truncate rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-300/15">
                    {subjectTitle}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 sm:flex sm:shrink-0">
            {onRevise && (
              <button
                type="button"
                onClick={() => onRevise(file)}
                className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-400/30 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/10 sm:min-h-0 sm:text-xs"
                title={docInfo.isExam ? "Proposer une correction de ce sujet" : "Lancer un quiz sur ce document"}
              >
                <GraduationCap className="h-4 w-4" />
                <span>{docInfo.isExam ? "Corriger" : "Quiz"}</span>
              </button>
            )}
            <a
              href={fileUrl(`/drive/files/${file.id}/preview`)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-on-primary transition hover:bg-emerald-300 sm:order-first sm:min-h-0 sm:text-xs ${onRevise ? "" : "col-span-2"}`}
              title="Lire le document en entier dans un nouvel onglet"
            >
              <BookOpenText className="h-4 w-4" />
              <span>Lire</span>
            </a>
            <button
              type="button"
              onClick={() => void shareDocument(file)}
              aria-label="Partager"
              title="Partager le lien (WhatsApp, Telegram…)"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#E7E4D9] px-3 py-2 text-xs font-medium text-body transition hover:border-[#E7E4D9] hover:bg-[#F8F7F2] hover:text-[#16241D] sm:min-h-0"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Partager</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Télécharger"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#E7E4D9] px-3 py-2 text-xs font-medium text-body transition hover:border-[#E7E4D9] hover:bg-[#F8F7F2] hover:text-[#16241D] sm:min-h-0"
              title="Télécharger le document original"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Télécharger</span>
            </button>
          </div>
          </div>

          {/* Hors ligne : utile avant un examen, quand le réseau ou les données manquent */}
          {offline !== "unknown" && (
            <div className="-mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#E7E4D9] bg-[#F8F7F2] px-3.5 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
                {offline === "yes" ? (
                  <><CloudCheck className="h-4 w-4 shrink-0 text-emerald-400" /> Disponible hors ligne sur cet appareil</>
                ) : (
                  <><CloudDownload className="h-4 w-4 shrink-0 text-subtle" /> Lisible sans réseau une fois gardé</>
                )}
              </span>
              {offline !== "yes" && (
                <button
                  type="button"
                  onClick={() => void saveOffline()}
                  disabled={offline === "saving"}
                  className="-my-1 flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-50"
                >
                  {offline === "saving" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                  {offline === "saving" ? "Téléchargement…" : "Garder hors ligne"}
                </button>
              )}
            </div>
          )}

          {/* L'aperçu agrandit la même vignette que celle de la liste */}
          <section aria-labelledby="document-preview-heading">
            <div className="mb-3 flex items-center justify-between">
              <h3 id="document-preview-heading" className="text-sm font-medium text-strong">
                Aperçu du document
              </h3>
              <span className="text-[11px] text-faint">Première page</span>
            </div>
            <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl bg-[#FFFFFF] p-3 sm:min-h-[340px] sm:p-5">
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
                  <div className="mb-3 rounded-xl bg-[#F8F7F2] p-3 text-subtle">
                    <ImageOff className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-body">Aperçu indisponible</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-subtle">
                    La vignette de ce document n'a pas pu être chargée. Tu peux quand même télécharger le fichier.
                  </p>
                  <button
                    type="button"
                    onClick={() => setThumbnailFailed(false)}
                    className="mt-3 text-xs font-medium text-sky-700 transition hover:text-sky-700"
                  >
                    Réessayer
                  </button>
                </div>
              )}
            </div>
            {isOfficeDocument && (
              <p className="mt-2 text-[11px] text-faint">
                Aperçu de la première {extension === "pptx" ? "diapositive" : "page"} · la mise en page peut différer du document original.
              </p>
            )}
          </section>

          {/* Structure détectée : titres limités visuellement, contenu complet au survol */}
          {chapters.length > 0 && (
            <section aria-labelledby="document-structure-heading">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Compass className="h-4 w-4 shrink-0 text-sky-700" />
                  <h3 id="document-structure-heading" className="text-sm font-medium text-strong">
                    Structure détectée
                  </h3>
                  <span className="rounded-md bg-[#F8F7F2] px-1.5 py-0.5 text-[10px] text-subtle">
                    {chapters.length}
                  </span>
                </div>
                {chapters.length > 7 && (
                  <button
                    type="button"
                    onClick={() => setShowAllChapters((current) => !current)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-muted transition hover:text-strong"
                  >
                    {showAllChapters ? "Réduire" : "Tout afficher"}
                    {showAllChapters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-[#E7E4D9] divide-y divide-[#E7E4D9]">
                {visibleChapters.map((chapter, index) => (
                  <div
                    key={`${chapter.number}-${chapter.title}-${index}`}
                    className="flex min-w-0 items-center gap-3 px-3 py-3 transition hover:bg-[#F8F7F2] sm:px-4"
                  >
                    <span className="w-7 shrink-0 text-[11px] font-medium tabular-nums text-subtle">
                      {String(chapter.number ?? index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p title={chapter.title} className="truncate text-xs font-medium text-strong sm:text-sm">
                        {chapter.title}
                      </p>
                      {(chapter.subtopics?.length ?? 0) > 0 && (
                        <p
                          title={chapter.subtopics?.join(" · ") ?? ""}
                          className="mt-1 truncate text-[11px] text-faint"
                        >
                          {(chapter.subtopics ?? []).slice(0, 3).join(" · ")}
                          {(chapter.subtopics ?? []).length > 3 ? " …" : ""}
                        </p>
                      )}
                    </div>
                    {(chapter.location || chapter.page != null) && (
                      <span className="shrink-0 rounded-md bg-[#F8F7F2] px-2 py-1 text-[10px] tabular-nums text-subtle">
                        {chapter.location || `p. ${chapter.page}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Wiki : entièrement masqué si le document n'appartient pas à un espace connu */}
          {hasKnownWorkspace && (
            <section aria-labelledby="associated-wiki-heading">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-sky-700" />
                  <h3 id="associated-wiki-heading" className="text-sm font-medium text-strong">
                    Fiches Wiki associées
                  </h3>
                  {linkedWikiList.length > 0 && (
                    <span className="rounded-md bg-[#F8F7F2] px-1.5 py-0.5 text-[10px] text-subtle">
                      {linkedWikiList.length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCreateWiki}
                  disabled={!canUseWiki}
                  title={isDifferentWorkspace ? "Passe d’abord dans l’espace du document" : undefined}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-300/[0.08] hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <BookPlus className="h-3.5 w-3.5" />
                  Créer une fiche
                </button>
              </div>

              {linkedWikiList.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-[#E7E4D9] divide-y divide-[#E7E4D9]">
                  {linkedWikiList.map((wikiPage) => (
                    <button
                      key={wikiPage.id}
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenWikiPage?.(wikiPage.id);
                      }}
                      className="group flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[#F8F7F2] sm:px-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p title={wikiPage.title} className="truncate text-sm font-medium text-strong transition group-hover:text-sky-700">
                          {wikiPage.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-subtle">
                          <span className={wikiPage.status === "verified" ? "text-sky-700" : "text-subtle"}>
                            {wikiPage.status === "verified" ? "Vérifiée" : "Communautaire"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{wikiPage.topic || "Général"}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-sky-700" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#E7E4D9] px-4 py-5 text-center">
                  <p className="text-xs text-subtle">Aucune fiche Wiki n'est encore associée à ce document.</p>
                  <button
                    type="button"
                    onClick={handleCreateWiki}
                    disabled={!canUseWiki}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-sky-700 transition hover:bg-sky-300/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
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
