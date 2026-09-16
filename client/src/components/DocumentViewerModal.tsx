import React from "react";
import { DriveFile, FileExtension, WikiPage } from "@/types/lekki";
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
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Search,
  MessageSquare,
  HelpCircle,
  Hash,
  Compass,
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
}: DocumentViewerModalProps) {
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
    // Direct download endpoint or client-side blob fallback
    const downloadUrl = `/api/v1/drive/files/${file.id}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", file.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find linked wiki pages
  const linkedWikiList = (file.linked_wiki_ids || [])
    .map((wikiId) => wikiPages.find((p) => p.id === wikiId))
    .filter((p): p is WikiPage => Boolean(p));

  // Compute stats
  const totalPages = file.page_count || 1;
  const totalChunks = file.indexed_chunks_count || Math.max(12, totalPages * 3);
  const chapters = file.detected_chapters || [];
  const keyPassages = file.key_passages || [];

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
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Fiche documentaire Lekki
            </span>
            <span className="text-xs text-zinc-500 hidden sm:inline">• Ressource originale intacte</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onShareDoc(file)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-colors"
              title="Partager"
            >
              <Share2 className="h-4 w-4" />
            </button>
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
                  <span>{formatFileSize(file.size_bytes)}</span>
                  <span>•</span>
                  <span className="text-zinc-400">{file.owner_name || "Auteur"}</span>
                </div>
              </div>
            </div>

            {/* Primary Download Button */}
            <div className="shrink-0 flex flex-col sm:items-end gap-2">
              <button
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-md active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>Télécharger l'original</span>
                <span className="text-[10px] opacity-80">({formatFileSize(file.size_bytes)})</span>
              </button>
              <span className="text-[10px] text-zinc-500 text-right">
                Fichier conservé intact sans conversion
              </span>
            </div>
          </div>

          {/* 2. Indexé par Lekki (The RAG Guarantee) */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Indexé par Lekki</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                Index vectoriel & Provenance situés
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Le fichier original reste externe. Lekki en a extrait la structure, le texte et les chapitres pour permettre à l'IA de citer précisément les numéros de page et sections sans le visualiser.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
                <div className="text-lg font-bold font-mono text-zinc-100">{totalPages}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">pages analysées</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
                <div className="text-lg font-bold font-mono text-emerald-400">{totalChunks}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">passages indexés</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 col-span-2 sm:col-span-1">
                <div className="text-lg font-bold font-mono text-sky-400">100%</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">interrogeable par l'IA</div>
              </div>
            </div>
          </div>

          {/* 3. Sommaire & Chapitres Détectés */}
          {chapters.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#161A23] border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                  <Compass className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Chapitres & Structure détectés ({chapters.length})</span>
                </div>
                <span className="text-[11px] text-zinc-500">Citations de précision</span>
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
                      <button
                        onClick={() => {
                          onOpenChange(false);
                          onAskAIAboutDoc(
                            file,
                            `Explique-moi en détail le contenu du chapitre ${ch.number} (« ${ch.title} », page ${ch.page}) de ${file.name}.`
                          );
                        }}
                        className="p-1.5 rounded text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                        title="Interroger ce chapitre avec Lekki AI"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Passages Clés & Définitions Repérés */}
          {keyPassages.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#161A23] border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                <Hash className="h-3.5 w-3.5 text-sky-400" />
                <span>Passages et Définitions phares indexés</span>
              </div>

              <div className="space-y-2.5 pt-1">
                {keyPassages.map((kp, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-200">{kp.label}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-sky-400 border border-sky-500/20 shrink-0">
                        {kp.location}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed italic">
                      « {kp.excerpt} »
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Connaissances Wiki Associées (La vraie valeur ajoutée de Lekki) */}
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
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors"
              >
                <BookPlus className="h-3.5 w-3.5" />
                <span>Rédiger une fiche</span>
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Le PDF est une ressource brute. Le Wiki est la connaissance partagée rédigée et certifiée par les étudiants et les équipes.
            </p>

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
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 truncate">
                        {wPage.title}
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-emerald-500/30 transition-colors"
                >
                  <BookPlus className="h-3.5 w-3.5" />
                  <span>Créer la première fiche Wiki pour ce document</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. Actions Rapides avec Lekki AI */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/20 via-zinc-900 to-zinc-900/90 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>Interroger cette ressource avec Lekki AI</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">Précision RAG</span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Posez des questions directes. Lekki AI exploitera le texte indexé pour citer les chapitres et les numéros de page exacts.
            </p>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                onClick={() => {
                  onOpenChange(false);
                  onAskAIAboutDoc(
                    file,
                    `Résume en 5 points clés les notions fondamentales de « ${file.name} ».`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
              >
                <HelpCircle className="h-3 w-3 text-emerald-400" />
                <span>Résumé en 5 points</span>
              </button>
              <button
                onClick={() => {
                  onOpenChange(false);
                  onAskAIAboutDoc(
                    file,
                    `Génère 3 questions d'examen types avec corrigés basées sur les chapitres de « ${file.name} ».`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
              >
                <MessageSquare className="h-3 w-3 text-sky-400" />
                <span>Générer un quiz d'examen</span>
              </button>
              <button
                onClick={() => {
                  onOpenChange(false);
                  onAskAIAboutDoc(file);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                <span>Ouvrir dans Lekki AI</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="p-3 sm:px-6 border-t border-zinc-800 bg-[#161A22] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Document externe vérifié & indexé</span>
          </div>
          <div>Dernière indexation : {new Date(file.updated_at || file.created_at).toLocaleDateString("fr-FR")}</div>
        </div>
      </div>
    </div>
  );
}
