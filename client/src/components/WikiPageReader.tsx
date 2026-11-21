import React, { useMemo, useState } from "react";
import { WikiHeaderBar } from "./WikiHeaderBar";
import { WikiBreadcrumbs, WikiBreadcrumbItem } from "./WikiBreadcrumbs";
import { MarkdownContent, markdownHeadingId } from "./MarkdownContent";
import { WikiPage, WikiStatus, DriveFile } from "@/types/lekki";
import { fileUrl, wiki } from "@/lib/api";
import { toast } from "sonner";
import {
  CheckCircle2,
  Users,
  Clock,
  Edit3,
  History,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Link2,
  MessageSquare,
  HelpCircle,
  FileSearch,
  Download,
  Layers,
  Settings2,
  Trash2
} from "lucide-react";

interface WikiPageReaderProps {
  page: WikiPage;
  availableFiles: DriveFile[];
  allPages?: WikiPage[];
  canVerifyWiki?: boolean;
  canManageWiki?: boolean;
  onBack: () => void;
  onNavigateTopic?: (topic: string) => void;
  onSelectPage?: (page: WikiPage) => void;
  onEdit: (page: WikiPage) => void;
  onViewHistory: (page: WikiPage) => void;
  onOpenDoc: (docId: string) => void;
  onAskAI: (page: WikiPage, initialQuestion?: string) => void;
  onStatusChanged: (updatedPage: WikiPage) => void;
  onDeletePage: (page: WikiPage) => void;
}

export function WikiPageReader({
  page,
  availableFiles,
  allPages = [],
  canVerifyWiki = false,
  canManageWiki = false,
  onBack,
  onNavigateTopic,
  onSelectPage,
  onEdit,
  onViewHistory,
  onOpenDoc,
  onAskAI,
  onStatusChanged,
  onDeletePage,
}: WikiPageReaderProps) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const handleStatusChange = async (newStatus: WikiStatus) => {
    setUpdatingStatus(true);
    try {
      const updated = await wiki.updateStatus(page.id, newStatus);
      toast.success(
        newStatus === "verified"
          ? "Page certifiée « Vérifiée » 🟢"
          : newStatus === "community"
          ? "Statut passé à « Communautaire » 🔵"
          : "Statut passé à « En cours de validation » 🟡"
      );
      onStatusChanged(updated);
      setShowStatusMenu(false);
    } catch {
      toast.error("Impossible de modifier ce statut. La vérification est réservée aux référents et responsables de l’espace.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const linkedFiles = availableFiles.filter((f) =>
    (page.related_document_ids || []).includes(f.id)
  );

  const relatedWikiList = (page.related_wiki_ids || [])
    .map((wikiId) => allPages.find((p) => p.id === wikiId))
    .filter((p): p is WikiPage => Boolean(p));

  const latestHistory = [...(page.versions || page.history || [])].sort(
    (a, b) => b.version - a.version
  )[0];
  const lastEditorName =
    page.last_editor_name ||
    page.author_name ||
    latestHistory?.author_name ||
    page.creator_name ||
    "Membre";
  const currentVersion =
    page.current_version ??
    Math.max(1, ...((page.versions || page.history || []).map((entry) => entry.version)));
  const updatedDate = page.updated_at
    ? new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(page.updated_at) ? page.updated_at : `${page.updated_at}Z`)
    : null;
  const formattedUpdatedAt = updatedDate && !Number.isNaN(updatedDate.getTime())
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(updatedDate)
    : "Date inconnue";

  const topicName = page.topic || "Général";
  const breadcrumbs = useMemo<WikiBreadcrumbItem[]>(() => {
    return [
      ...(topicName && topicName !== "Général"
        ? [{ label: topicName, onClick: () => onNavigateTopic?.(topicName) }]
        : []),
      { label: page.title },
    ];
  }, [onNavigateTopic, page.title, topicName]);

  // Le titre est déjà affiché en tête de page : on retire le « # Titre » répété au début du contenu.
  const body = useMemo(() => {
    const match = page.content.match(/^\s*#\s+(.+?)\s*#*\s*(?:\r?\n|$)/);
    const same = match && match[1].trim().toLowerCase() === page.title.trim().toLowerCase();
    return same ? page.content.slice(match[0].length).replace(/^\s+/, "") : page.content;
  }, [page.content, page.title]);

  const headings = useMemo(() => body
    .split("\n")
    .map((line) => {
      const match = /^(#{1,3})\s+(.+)$/.exec(line.trim());
      if (!match) return null;
      const title = match[2].replace(/\s+#+$/, "").trim();
      const id = markdownHeadingId(title);
      return { title, level: match[1].length, id };
    })
    .filter((heading): heading is { title: string; level: number; id: string } => Boolean(heading)),
  [body]);

  return (
    <div id="wiki-page-reader" className="flex-1 flex flex-col min-w-0 bg-[#F8F7F4] overflow-hidden">
      {/* 1. Header Bar: Breadcrumb only */}
      <WikiHeaderBar>
        <WikiBreadcrumbs items={breadcrumbs} onRootClick={onBack} />
      </WikiHeaderBar>

      {/* Main Layout: Content (Left) + Context Panel (Right) */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT: Main Page Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="w-full max-w-[88rem] mx-auto px-6 py-8 sm:px-10 sm:py-12 xl:px-14 flex flex-col gap-10">

            {/* TITLE & METADATA */}
            <header className="space-y-6 border-b border-line/60 pb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-heading leading-tight">
                {page.title}
              </h1>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted">
                {/* Status Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu((prev) => !prev)}
                    disabled={updatingStatus || (page.status === "verified" && !canVerifyWiki)}
                    title={page.status === "verified" && !canVerifyWiki ? "Une page vérifiée ne peut être modifiée que par un référent ou un responsable" : undefined}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
                      page.status === "verified"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        : page.status === "community"
                        ? "bg-sky-500/10 text-sky-700 border-sky-500/20 hover:bg-sky-500/20"
                        : "bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/20"
                    }`}
                  >
                    {page.status === "verified" && <CheckCircle2 className="h-4 w-4" />}
                    {page.status === "community" && <Users className="h-4 w-4" />}
                    {page.status === "draft" && <Clock className="h-4 w-4" />}
                    <span className="font-medium text-xs">
                      {page.status === "verified"
                        ? "Vérifiée"
                        : page.status === "community"
                        ? "Communautaire"
                        : "Brouillon"}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60 ml-1" />
                  </button>

                  {showStatusMenu && (
                    <div className="absolute left-0 mt-2 w-56 rounded-xl bg-[#FFFFFF] border border-line-strong/80 shadow-2xl py-1 z-30 overflow-hidden">
                      {canVerifyWiki && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange("verified")}
                          className="w-full px-4 py-2 text-left flex flex-col gap-0.5 hover:bg-[#EFEEE7] text-emerald-400 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-3.5 w-3.5"/> Vérifiée</div>
                          <div className="text-[10px] text-subtle pl-5.5">Validée par un référent</div>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStatusChange("community")}
                        className="w-full px-4 py-2 text-left flex flex-col gap-0.5 hover:bg-[#EFEEE7] text-sky-700 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium"><Users className="h-3.5 w-3.5"/> Communautaire</div>
                        <div className="text-[10px] text-subtle pl-5.5">Enrichie par les pairs</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange("draft")}
                        className="w-full px-4 py-2 text-left flex flex-col gap-0.5 hover:bg-[#EFEEE7] text-amber-700 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium"><Clock className="h-3.5 w-3.5"/> Brouillon</div>
                        <div className="text-[10px] text-subtle pl-5.5">En cours de rédaction</div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Sur téléphone, le panneau latéral est masqué : les actions sont ici. */}
                <div className="flex items-center gap-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => onEdit(page)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong/80 bg-[#F8F7F2] px-3 text-xs font-medium text-strong"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewHistory(page)}
                    aria-label="Historique"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong/80 bg-[#F8F7F2] text-body"
                  >
                    <History className="h-4 w-4" />
                  </button>
                </div>

                {canManageWiki && (
                  <button
                    type="button"
                    onClick={() => onDeletePage(page)}
                    aria-label="Supprimer la page"
                    title="Supprimer la page"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/[0.04] text-rose-700 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 lg:hidden"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                <div className="flex items-center gap-x-3 gap-y-2 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                      {lastEditorName.trim().charAt(0).toUpperCase() || "M"}
                    </div>
                    <span className="text-body">{lastEditorName}</span>
                    <span className="text-faint">a modifié cette page</span>
                  </div>
                  <span className="text-faint">•</span>
                  <span>Le {formattedUpdatedAt}</span>
                  <span className="text-faint">•</span>
                  <span className="font-mono bg-[#F1F0E9]/50 px-1.5 py-0.5 rounded text-muted">v{currentVersion}</span>
                </div>
              </div>
            </header>

            {/* CONTENT */}
            <MarkdownContent content={body} className="max-w-[78ch] text-[15px] leading-relaxed" />

            <div className="h-32" /> {/* Spacer for the bottom */}
          </div>
        </div>

        {/* RIGHT: Context Panel */}
        <div className="w-80 sm:w-96 border-l border-line/60 bg-[#F8F7F4]/50 backdrop-blur-sm overflow-y-auto p-6 space-y-8 shrink-0 hidden lg:block">

          {headings.length > 1 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-body">Sur cette page</h2>
              <nav aria-label="Sommaire de la page" className="space-y-1 border-l border-line pl-3">
                {headings.map((heading, index) => (
                  <button key={`${heading.id}-${index}`} onClick={() => document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth", block: "start" })} className={`block w-full truncate py-1 text-left text-xs transition-colors hover:text-emerald-300 ${heading.level > 2 ? "pl-3 text-subtle" : "text-muted"}`}>
                    {heading.title}
                  </button>
                ))}
              </nav>
            </section>
          )}

          {/* 1. AI Quick Actions (PRIORITY) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
              <Sparkles className="h-3.5 w-3.5" />
              Lekki AI
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onAskAI(page, `Explique-moi la notion « ${page.title} » simplement et donne-moi un exemple concret.`)}
                className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#F8F7F2] hover:bg-[#EFEEE7] border border-line/80 hover:border-line-strong transition-colors text-left group"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-body group-hover:text-emerald-300">
                  <HelpCircle className="h-3.5 w-3.5 text-emerald-500" />
                  Expliquer
                </div>
                <div className="text-[10px] text-subtle leading-tight">Obtenir une explication simple avec des exemples.</div>
              </button>
              <button
                onClick={() => onAskAI(page, `Génère 3 questions d'examen types avec leurs corrigés détaillés basés sur « ${page.title} ».`)}
                className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#F8F7F2] hover:bg-[#EFEEE7] border border-line/80 hover:border-line-strong transition-colors text-left group"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-body group-hover:text-sky-700">
                  <MessageSquare className="h-3.5 w-3.5 text-sky-700" />
                  Quiz d'examen
                </div>
                <div className="text-[10px] text-subtle leading-tight">S'entraîner avec des questions types.</div>
              </button>
              <button
                onClick={() => onAskAI(page, `Résume en 5 points clés les notions fondamentales de « ${page.title} ».`)}
                className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#F8F7F2] hover:bg-[#EFEEE7] border border-line/80 hover:border-line-strong transition-colors text-left group"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-body group-hover:text-amber-700">
                  <FileSearch className="h-3.5 w-3.5 text-amber-700" />
                  Résumé express
                </div>
                <div className="text-[10px] text-subtle leading-tight">Extraire les 5 points fondamentaux.</div>
              </button>
            </div>
          </div>

          {/* 2. Related Wiki Pages */}
          {relatedWikiList.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-strong flex items-center gap-2 uppercase tracking-wider font-mono">
                <Link2 className="h-3.5 w-3.5 text-emerald-400" />
                Notions reliées
              </h3>
              <div className="flex flex-col gap-2">
                {relatedWikiList.map((relPage) => (
                  <button
                    key={relPage.id}
                    onClick={() => onSelectPage?.(relPage)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#F8F7F2] hover:bg-[#EFEEE7]/60 border border-line/80 hover:border-line-strong transition-colors text-left group"
                  >
                    <span className="text-subtle group-hover:text-emerald-400 transition-colors">📖</span>
                    <span className="text-sm text-body group-hover:text-heading truncate flex-1">{relPage.title}</span>
                    <ChevronRight className="h-4 w-4 text-faint group-hover:text-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Source Documents */}
          {linkedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-strong flex items-center gap-2 uppercase tracking-wider font-mono">
                <FileText className="h-3.5 w-3.5 text-sky-700" />
                Documents sources
              </h3>
              <div className="flex flex-col gap-2">
                {linkedFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => onOpenDoc(file.id)}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#F8F7F2] hover:bg-[#EFEEE7]/60 border border-line/80 hover:border-line-strong transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-subtle group-hover:text-sky-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-body group-hover:text-heading truncate">{file.name}</div>
                        <div className="text-[10px] text-subtle font-mono mt-0.5 uppercase">{file.extension}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const downloadUrl = fileUrl(`/drive/files/${file.id}/download`);
                        const link = document.createElement("a");
                        link.href = downloadUrl;
                        link.setAttribute("download", file.name);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success(`Téléchargement de « ${file.name} »`);
                      }}
                      className="p-1.5 rounded-md hover:bg-[#E9E6DD] text-subtle hover:text-body transition-colors"
                      title="Télécharger"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Page Management Actions */}
          <div className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-subtle font-bold">
              <Settings2 className="h-3.5 w-3.5" />
              Gestion de page
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onEdit(page)}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-[#F8F7F2] hover:bg-[#EFEEE7] border border-line/80 hover:border-line-strong transition-colors text-xs font-medium text-body"
              >
                <Edit3 className="h-3.5 w-3.5 text-subtle" />
                Modifier
              </button>
              <button
                onClick={() => onViewHistory(page)}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-[#F8F7F2] hover:bg-[#EFEEE7] border border-line/80 hover:border-line-strong transition-colors text-xs font-medium text-body"
              >
                <History className="h-3.5 w-3.5 text-subtle" />
                Historique
              </button>
            </div>
            {canManageWiki && (
              <button
                type="button"
                onClick={() => onDeletePage(page)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-2.5 text-xs font-medium text-rose-700 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer la page
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
