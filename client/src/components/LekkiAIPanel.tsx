import React, { useState, useEffect, useRef } from "react";
import { aiApi } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LekkiAIChatMessage, LekkiAISource } from "@/types/lekki";
import { toast } from "sonner";
import {
  Sparkles,
  X,
  Send,
  FileText,
  BookOpen,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  Bot,
  User,
  Download,
  CheckCircle2,
  Layers,
} from "lucide-react";

interface LekkiAIPanelProps {
  open: boolean;
  onClose: () => void;
  onOpenDoc: (docId: string) => void;
  onOpenWiki: (wikiId: string) => void;
  initialQuestion?: string;
}

export function LekkiAIPanel({
  open,
  onClose,
  onOpenDoc,
  onOpenWiki,
  initialQuestion,
}: LekkiAIPanelProps) {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const [messages, setMessages] = useState<LekkiAIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history on open
  useEffect(() => {
    if (open) {
      aiApi
        .history()
        .then((hist) => setMessages(hist))
        .catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle initial question passed from outside (e.g. from document viewer or search)
  useEffect(() => {
    if (open && initialQuestion) {
      handleAsk(initialQuestion);
    }
  }, [open, initialQuestion]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!open) return null;

  const handleAsk = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || loading) return;

    // Optimistically add user message
    const tempUserMsg: LekkiAIChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await aiApi.ask(q, activeWorkspaceId || undefined);

      const assistantMsg: LekkiAIChatMessage = {
        id: response.message_id || `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        contradiction: response.contradiction || undefined,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      toast.error("Erreur lors de l'interrogation de Lekki AI");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await aiApi.clearHistory();
      setMessages([]);
      toast.success("Historique de conversation réinitialisé");
    } catch {
      toast.error("Impossible de réinitialiser l'historique");
    }
  };

  const suggestedQuestions = [
    "Explique-moi OSPF à partir de mes documents",
    "Quelle est la différence entre TCP et UDP ?",
    "Quelle est la métrique OSPF par défaut sur un lien Gigabit ?",
    "Trouve-moi les TD de réseaux disponibles",
  ];

  const handleDownloadDoc = (fileId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const downloadUrl = `/api/v1/drive/files/${fileId}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Téléchargement de « ${fileName} » lancé`);
  };

  return (
    <div
      id="lekki-ai-panel-overlay"
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] bg-[#12151B] border-l border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-[#161922] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <h2 className="text-sm font-bold text-zinc-100">Lekki AI</h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                RAG Grounded
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Assistant documentaire contextualisé
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Effacer la conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Perimeter Indicator (Section 4 & 16) */}
      <div className="px-4 py-2.5 bg-zinc-950/60 border-b border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">
            Périmètre : Mon Espace + Partagés + {activeWorkspace?.name || "Workspace"}
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400/90 shrink-0">
          Strict Access
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {messages.length === 0 && (
          <div className="py-8 space-y-4">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-center space-y-2">
              <Bot className="h-8 w-8 mx-auto text-emerald-400" />
              <div className="font-semibold text-zinc-200 text-sm">
                Posez vos questions à Lekki
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">
                Lekki AI analyse simultanément vos documents personnels, les ressources
                partagées avec vous et le Wiki de votre Workspace.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase text-zinc-500 font-semibold px-1">
                Suggestions de questions
              </div>
              <div className="space-y-1.5">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAsk(q)}
                    className="w-full text-left p-2.5 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 hover:text-emerald-300 transition-colors text-xs"
                  >
                    « {q} »
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-2 ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
              {msg.role === "user" ? (
                <>
                  <span>Vous</span>
                  <User className="h-3 w-3" />
                </>
              ) : (
                <>
                  <Bot className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Lekki AI</span>
                </>
              )}
            </div>

            <div
              className={`p-3.5 rounded-xl max-w-[92%] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-emerald-600 text-zinc-950 font-medium"
                  : "bg-zinc-900/90 border border-zinc-800 text-zinc-200 shadow-sm"
              }`}
            >
              {msg.content}
            </div>

            {/* Section 14: Contradiction or Nuance Callout */}
            {msg.contradiction && (
              <div className="w-full p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Nuance ou contradiction documentaire identifiée :</span>
                </div>
                <p className="text-[11px] leading-relaxed">{msg.contradiction}</p>
              </div>
            )}

            {/* Section 11: Provenance explicite des sources citées (Situer le lecteur) */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="w-full p-3.5 rounded-xl bg-zinc-950/85 border border-zinc-800/80 space-y-2.5 text-[11px]">
                <div className="font-mono text-[10px] uppercase text-zinc-400 font-semibold flex items-center justify-between">
                  <span>Sources & Provenances ({msg.sources.length})</span>
                  <span className="text-emerald-400">Indexation située</span>
                </div>

                <div className="space-y-2">
                  {msg.sources.map((src, i) => (
                    <div
                      key={i}
                      className="w-full text-left p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800/80 transition-all hover:border-zinc-700/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {src.type === "document" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/20 shrink-0">
                              {src.file_extension || "DOC"}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                              WIKI
                            </span>
                          )}
                          <span className="font-medium text-zinc-200 truncate">
                            {src.title}
                          </span>
                        </div>

                        {/* Situated Location Badge */}
                        {(src.location || src.detail) && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 shrink-0">
                            {src.location || src.detail}
                          </span>
                        )}
                      </div>

                      {src.excerpt && (
                        <p className="text-[10px] text-zinc-400 line-clamp-2 font-mono bg-black/30 p-1.5 rounded border border-zinc-800/50 italic">
                          « {src.excerpt} »
                        </p>
                      )}

                      {/* Action buttons for citation */}
                      <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                        {src.type === "document" ? (
                          <>
                            <button
                              onClick={() => onOpenDoc(src.id)}
                              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                            >
                              <Layers className="h-3 w-3" />
                              <span>Fiche d'index</span>
                            </button>

                            <button
                              onClick={(e) => handleDownloadDoc(src.id, src.title, e)}
                              className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                              title="Télécharger le document original intact"
                            >
                              <Download className="h-3 w-3" />
                              <span>Télécharger l'original</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onOpenWiki(src.id)}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                          >
                            <BookOpen className="h-3 w-3" />
                            <span>Ouvrir la fiche Wiki</span>
                            <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-70" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
            <span>Consultation des documents originaux et du Wiki en cours...</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(input);
        }}
        className="p-3 border-t border-zinc-800 bg-[#161922] shrink-0"
      >
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question sur vos cours, TD, synthèses..."
            disabled={loading}
            className="w-full pl-3 pr-10 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-1.5 p-1.5 rounded-md bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:hover:bg-emerald-500"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
