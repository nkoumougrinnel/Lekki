import React, { useState } from "react";
import { WikiHeaderBar } from "./WikiHeaderBar";
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
  ChevronRight,
  ChevronDown,
  Link2,
  MessageSquare,
  HelpCircle,
  FileSearch,
  Download,
  Layers,
  Settings2
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

  const linkedFiles = availableFiles.filter((f) =>
    (page.related_document_ids || []).includes(f.id)
  );

  const relatedWikiList = (page.related_wiki_ids || [])
    .map((wikiId) => allPages.find((p) => p.id === wikiId))
    .filter((p): p is WikiPage => Boolean(p));

  const topicName = page.topic || "Général";
  const sectionName = page.section || "Autres";

  return (
    <div id="wiki-page-reader" className="flex-1 flex flex-col min-w-0 bg-[#0E1116] overflow-hidden">
      {/* 1. Header Bar: Breadcrumb only */}
      <WikiHeaderBar>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 flex-wrap">
          <button
            onClick={onBack}
            className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-zinc-300 font-medium"
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
          <span className="text-zinc-500">{sectionName}</span>
        </div>
      </WikiHeaderBar>

      {/* Main Layout: Content (Left) + Context Panel (Right) */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT: Main Page Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl w-full mx-auto p-6 sm:px-10 sm:py-12 flex flex-col gap-10">

            {/* TITLE & METADATA */}
            <header className="space-y-6 border-b border-zinc-800/60 pb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100 leading-tight">
                {page.title}
              </h1>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-zinc-400">
                {/* Status Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu((prev) => !prev)}
                    disabled={updatingStatus}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
                      page.status === "verified"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        : page.status === "community"
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
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
                    <div className="absolute left-0 mt-2 w-56 rounded-xl bg-[#161A22] border border-zinc-700/80 shadow-2xl py-1 z-30 overflow-hidden">
                      <button
                        onClick={() => handleStatusChange("verified")}
                        className="w-full px-4 py-2 text-left flex flex-col gap-0.5 hover:bg-zinc-800 text-emerald-400 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-3.5 w-3.5"/> Vérifiée</div>
                        <div className="text-[10px] text-zinc-500 pl-5.5">Validée par un référent</div>
                      </button>
                      <button
                        onClick={() => handleStatusChange("community")}
                        className="w-full px-4 py-2 text-left flex flex-col gap-0.5 hover:bg-zinc-800 text-sky-400 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium"><Users className="h-3.5 w-3.5"/> Communautaire</div>
                        <div className="text-[10px] text-zinc-500 pl-5.5">Enrichie par les pairs</div>
                      </button>
                      <button
                        onClick={() => handleStatusChange("draft")}
                        className="w-full px-4 py-2 text-left flex flex-col gap-0.5 hover:bg-zinc-800 text-amber-400 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium"><Clock className="h-3.5 w-3.5"/> Brouillon</div>
                        <div className="text-[10px] text-zinc-500 pl-5.5">En cours de rédaction</div>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                      {(page.author_name || page.creator_name || "M")[0].toUpperCase()}
                    </div>
                    <span>{page.author_name || page.creator_name || "Membre"}</span>
                  </div>
                  <span className="text-zinc-600">•</span>
                  <span>Modifié le {new Date(page.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded text-zinc-500">v{page.current_version || 1}</span>
                </div>
              </div>
            </header>

            {/* CONTENT */}
            <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 text-[15px] leading-relaxed">
              <div className="whitespace-pre-wrap font-sans">
                {page.content}
              </div>
            </div>

            <div className="h-32" /> {/* Spacer for the bottom */}
          </div>
        </div>

        {/* RIGHT: Context Panel */}
        <div className="w-80 sm:w-96 border-l border-zinc-800/60 bg-[#0E1116]/50 backdrop-blur-sm overflow-y-auto p-6 space-y-8 shrink-0 hidden lg:block">

          {/* 1. AI Quick Actions (PRIORITY) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
              <Sparkles className="h-3.5 w-3.5" />
              Lekki AI
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onAskAI(page, `Explique-moi la notion « ${page.title} » simplement et donne-moi un exemple concret.`)}
                className="flex flex-col gap-1.5 p-3 rounded-lg bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 transition-colors text-left group"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-300 group-hover:text-emerald-300">
                  <HelpCircle className="h-3.5 w-3.5 text-emerald-500" />
                  Expliquer
                </div>
                <div className="text-[10px] text-zinc-500 leading-tight">Obtenir une explication simple avec des exemples.</div>
              </button>
              <button
                onClick={() => onAskAI(page, `Génère 3 questions d'examen types avec leurs corrigés détaillés basés sur « ${page.title} ».`)}
                className="flex flex-col gap-1.5 p-3 rounded-lg bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 transition-colors text-left group"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-300 group-hover:text-sky-300">
                  <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
                  Quiz d'examen
                </div>
                <div className="text-[10px] text-zinc-500 leading-tight">S'entraîner avec des questions types.</div>
              </button>
              <button
                onClick={() => onAskAI(page, `Résume en 5 points clés les notions fondamentales de « ${page.title} ».`)}
                className="flex flex-col gap-1.5 p-3 rounded-lg bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 transition-colors text-left group"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-300 group-hover:text-amber-300">
                  <FileSearch className="h-3.5 w-3.5 text-amber-500" />
                  Résumé express
                </div>
                <div className="text-[10px] text-zinc-500 leading-tight">Extraire les 5 points fondamentaux.</div>
              </button>
            </div>
          </div>

          {/* 2. Related Wiki Pages */}
          {relatedWikiList.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2 uppercase tracking-wider font-mono">
                <Link2 className="h-3.5 w-3.5 text-emerald-400" />
                Notions reliées
              </h3>
              <div className="flex flex-col gap-2">
                {relatedWikiList.map((relPage) => (
                  <button
                    key={relPage.id}
                    onClick={() => onSelectPage?.(relPage)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors text-left group"
                  >
                    <span className="text-zinc-500 group-hover:text-emerald-400 transition-colors">📖</span>
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100 truncate flex-1">{relPage.title}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Source Documents */}
          {linkedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2 uppercase tracking-wider font-mono">
                <FileText className="h-3.5 w-3.5 text-sky-400" />
                Documents sources
              </h3>
              <div className="flex flex-col gap-2">
                {linkedFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => onOpenDoc(file.id)}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-zinc-500 group-hover:text-sky-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-zinc-300 group-hover:text-zinc-100 truncate">{file.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase">{file.extension}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const downloadUrl = `/api/v1/drive/files/${file.id}/download`;
                        const link = document.createElement("a");
                        link.href = downloadUrl;
                        link.setAttribute("download", file.name);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success(`Téléchargement de « ${file.name} »`);
                      }}
                      className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
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
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
              <Settings2 className="h-3.5 w-3.5" />
              Gestion de page
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onEdit(page)}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 transition-colors text-xs font-medium text-zinc-300"
              >
                <Edit3 className="h-3.5 w-3.5 text-zinc-500" />
                Modifier
              </button>
              <button
                onClick={() => onViewHistory(page)}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 transition-colors text-xs font-medium text-zinc-300"
              >
                <History className="h-3.5 w-3.5 text-zinc-500" />
                Historique
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
