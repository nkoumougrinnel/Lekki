import React, { useState } from "react";
import { WikiPage, WikiStatus, DriveFile } from "@/types/lekki";
import { wiki } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  Users,
  Clock,
  Edit3,
  History,
  FileText,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  Link2,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  FileSearch,
} from "lucide-react";

interface WikiPageReaderProps {
  page: WikiPage;
  availableFiles: DriveFile[];
  allPages?: WikiPage[];
  onBack: () => void;
  onNavigateTopic?: (topic: string) => void;
  onSelectPage?: (page: WikiPage) => void;
  onEdit: (page: WikiPage) => void;
  onViewHistory: (page: WikiPage) => void;
  onOpenDoc: (docId: string) => void;
  onAskAI: (page: WikiPage, initialQuestion?: string) => void;
  onStatusChanged: (updatedPage: WikiPage) => void;
}

export function WikiPageReader({
  page,
  availableFiles,
  allPages = [],
  onBack,
  onNavigateTopic,
  onSelectPage,
  onEdit,
  onViewHistory,
  onOpenDoc,
  onAskAI,
  onStatusChanged,
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
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Find linked documents in the available Drive files
  const linkedFiles = availableFiles.filter((f) =>
    (page.related_document_ids || []).includes(f.id)
  );

  // Find related wiki pages
  const relatedWikiList = (page.related_wiki_ids || [])
    .map((wikiId) => allPages.find((p) => p.id === wikiId))
    .filter((p): p is WikiPage => Boolean(p));

  const topicName = page.topic || "Réseaux";
  const sectionName = page.section || "Général";

  return (
    <div id="wiki-page-reader" className="flex-1 flex flex-col min-w-0 bg-[#0E1116] overflow-y-auto">
      {/* 1. Header Bar: Breadcrumb + Clean Actions */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-[#12151B]/80 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Breadcrumb: Wiki / [Topic] / [Section] / [Title] */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 flex-wrap">
            <button
              onClick={onBack}
              className="hover:text-emerald-400 transition-colors flex items-center gap-1 text-zinc-300 font-medium"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
              <span>Wiki</span>
            </button>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <button
              onClick={() => onNavigateTopic?.(topicName)}
              className="hover:text-emerald-400 transition-colors text-zinc-300"
            >
              {topicName}
            </button>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <span className="text-zinc-400">{sectionName}</span>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <span className="text-zinc-100 font-medium truncate max-w-[200px]">
              {page.title}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Ask AI button */}
            <button
              onClick={() => onAskAI(page)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Demander à Lekki AI</span>
            </button>

            {/* History button */}
            <button
              onClick={() => onViewHistory(page)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
            >
              <History className="h-3.5 w-3.5 text-emerald-400" />
              <span>v{page.current_version || page.history?.length || 1} • Historique</span>
            </button>

            {/* Edit button */}
            <button
              onClick={() => onEdit(page)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Modifier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Page Article View */}
      <div className="max-w-4xl w-full mx-auto p-6 sm:p-10 space-y-8">
        {/* Title and Discreet Verification Badge */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              {page.title}
            </h1>

            {/* Discreet Verification Status Badge (Dropdown) */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                  page.status === "verified"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                    : page.status === "community"
                    ? "bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                }`}
                title="Changer l'état de validation de la page"
              >
                {page.status === "verified" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                {page.status === "community" && <Users className="h-3.5 w-3.5 text-sky-400" />}
                {page.status === "draft" && <Clock className="h-3.5 w-3.5 text-amber-400" />}
                <span>
                  {page.status === "verified"
                    ? page.status_verified_by
                      ? `🟢 Vérifiée par ${page.status_verified_by}`
                      : "🟢 Vérifiée"
                    : page.status === "community"
                    ? "🔵 Communautaire"
                    : "○ En cours de validation"}
                </span>
                <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
              </button>

              {showStatusMenu && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-[#161A22] border border-zinc-700/80 shadow-2xl py-1.5 z-30">
                  <div className="px-3 py-1 text-[10px] font-mono text-zinc-500 uppercase">
                    Statut de vérification
                  </div>
                  <button
                    onClick={() => handleStatusChange("verified")}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-800 text-emerald-300 transition-colors"
                  >
                    <span>🟢</span>
                    <div>
                      <div className="font-medium">Vérifiée</div>
                      <div className="text-[10px] text-zinc-400">Validée par un référent ou enseignant</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleStatusChange("community")}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-800 text-sky-300 transition-colors"
                  >
                    <span>🔵</span>
                    <div>
                      <div className="font-medium">Communautaire</div>
                      <div className="text-[10px] text-zinc-400">Enrichie collectivement par les pairs</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleStatusChange("draft")}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-800 text-amber-300 transition-colors"
                  >
                    <span>🟡</span>
                    <div>
                      <div className="font-medium">En cours de validation</div>
                      <div className="text-[10px] text-zinc-400">Brouillon ou relecture en cours</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Discreet Light Metadata */}
          <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
            <span>
              Par <span className="text-zinc-300">{page.author_name || page.creator_name || "Membre"}</span>
            </span>
            <span>•</span>
            <span>
              Dernière mise à jour le{" "}
              <span className="text-zinc-300">
                {new Date(page.updated_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </span>
            <span>•</span>
            <span className="text-zinc-500 font-mono">
              v{page.current_version || page.history?.length || 1}
            </span>
          </div>
        </div>

        {/* 2. Markdown Content */}
        <div className="prose prose-invert prose-zinc max-w-none text-zinc-200 text-sm leading-relaxed pt-4 border-t border-zinc-800/80">
          <div className="whitespace-pre-wrap font-sans leading-relaxed">
            {page.content}
          </div>
        </div>

        {/* 3. Section: NOTIONS RELIÉES & LIENS TRANSVERSAUX (Section 6 du cadrage) */}
        {relatedWikiList.length > 0 && (
          <div className="p-5 rounded-2xl bg-[#12151B] border border-zinc-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              <Link2 className="h-3.5 w-3.5" />
              <span>Notions reliées & Liens transversaux</span>
            </div>
            <p className="text-xs text-zinc-400">
              Ces notions approfondissent ou complètent les concepts traités dans cette page :
            </p>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {relatedWikiList.map((relPage) => (
                <button
                  key={relPage.id}
                  onClick={() => onSelectPage?.(relPage)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-emerald-300 border border-zinc-800 hover:border-emerald-500/40 transition-all group shadow-sm"
                >
                  <span className="text-zinc-500 group-hover:text-emerald-400">📖</span>
                  <span>{relPage.title}</span>
                  <ChevronRight className="h-3 w-3 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Section: DOCUMENTS ORIGINAUX SOURCES DU DRIVE (Section 7 & 9 du cadrage) */}
        {linkedFiles.length > 0 && (
          <div className="p-5 rounded-2xl bg-[#12151B] border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <span>Documents originaux sources ({linkedFiles.length})</span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Documents stockés dans le Drive du Workspace
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {linkedFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => onOpenDoc(file.id)}
                  className="p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center justify-between gap-3 group shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-200 group-hover:text-emerald-300 truncate">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {file.page_count ? `${file.page_count} pages • ` : ""}
                        {file.owner_name}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-300 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Section: ACTION RAPIDE LEKKI AI */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/20 via-zinc-900 to-zinc-900/90 border border-emerald-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Exploiter cette fiche avec Lekki AI</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">Assistant RAG</span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Interrogez l'intelligence artificielle pour clarifier un point difficile, générer des fiches de révision ou comparer avec vos cours.
          </p>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button
              onClick={() => onAskAI(page, `Explique-moi la notion « ${page.title} » simplement et donne-moi un exemple concret.`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
            >
              <HelpCircle className="h-3 w-3 text-emerald-400" />
              <span>Expliquer simplement</span>
            </button>
            <button
              onClick={() => onAskAI(page, `Génère 3 questions d'examen types avec leurs corrigés détaillés basés sur « ${page.title} ».`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
            >
              <MessageSquare className="h-3 w-3 text-sky-400" />
              <span>Générer un quiz d'examen</span>
            </button>
            <button
              onClick={() => onAskAI(page, `Résume en 5 points clés les notions fondamentales de « ${page.title} ».`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
            >
              <FileSearch className="h-3 w-3 text-amber-400" />
              <span>Résumé en 5 points</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
