import React, { useState, useEffect, useRef } from "react";
import { aiApi } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LekkiAIChatMessage, LekkiAISource } from "@/types/lekki";
import { toast } from "sonner";
import {
  Sparkles,
  X,
  Send,
  BookOpen,
  RotateCcw,
  ExternalLink,
  Bot,
  User,
  Layers,
} from "lucide-react";

interface LekkiAIPanelProps {
  open: boolean;
  onClose: () => void;
  onOpenDoc: (docId: string) => void;
  onOpenWiki: (wikiId: string) => void;
  initialQuestion?: string;
}

// Helper component for the typing effect
function TypingText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 15); // Typing speed in ms
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  return <span>{displayedText}</span>;
}

export function LekkiAIPanel({
  open,
  onClose,
  onOpenDoc,
  onOpenWiki,
  initialQuestion,
}: LekkiAIPanelProps) {
  const { activeWorkspace, activeWorkspaceId, workspaces } = useWorkspace();
  const [messages, setMessages] = useState<LekkiAIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastAnimatedId, setLastAnimatedId] = useState<string | null>(null);
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

  // Handle initial question passed from outside
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
      setLastAnimatedId(assistantMsg.id);
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

  // Helper to clean location
  const cleanLocation = (loc: string) => {
    if (!loc) return "";
    const pageMatch = loc.match(/(p\.\s*\d+|page\s*\d+)/i);
    if (pageMatch) return pageMatch[0];
    const parts = loc.split(",");
    return parts[parts.length - 1].trim();
  };

  const sourceLocation = (src: LekkiAISource) => {
    if (src.type === "document") {
      return src.page ? `p. ${src.page}` : src.location ? cleanLocation(src.location) : "p. 1";
    }
    return src.location ? cleanLocation(src.location) : "Wiki";
  };

  return (
    <div
      id="lekki-ai-panel-overlay"
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] bg-[#12151B] border-l border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="h-16 border-b border-zinc-800 bg-[#161922] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/lekki-ai-logo.png"
            alt="Lekki AI Logo"
            className="h-8 w-8 object-contain"
          />
          <h2 className="text-sm font-bold text-zinc-100 tracking-wide">Lekki AI</h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Effacer la conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {messages.length === 0 && (
          <div className="py-8 space-y-4">
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center space-y-3">
              <Bot className="h-10 w-10 mx-auto text-emerald-400 opacity-80" />
              <div className="font-semibold text-zinc-200 text-sm">Prêt pour vos questions</div>
              <p className="text-zinc-400 text-xs leading-relaxed max-w-xs mx-auto">
                Je parcours vos documents et le Wiki pour vous répondre avec précision.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase text-zinc-500 font-semibold px-1">Suggestions</div>
              <div className="space-y-1.5">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAsk(q)}
                    className="w-full text-left p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 hover:text-emerald-300 transition-all text-xs"
                  >
                    « {q} »
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const uniqueSources = msg.sources ? Array.from(
            new Map(msg.sources.map(s => [s.id, s])).values()
          ) : [];

          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                {msg.role === "user" ? (
                  <><span>Vous</span><User className="h-3 w-3" /></>
                ) : (
                  <>
                    <img src="/lekki-ai-logo.png" alt="Lekki AI" className="h-6 w-6 rounded-full" />
                    <span className="text-emerald-400 font-bold uppercase tracking-wider">Lekki AI</span>
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
                {msg.role === "assistant" && msg.id === lastAnimatedId ? (
                  <TypingText text={msg.content} />
                ) : (
                  msg.content
                )}
              </div>

              {uniqueSources.length > 0 && (
                <div className="w-full p-3.5 rounded-xl bg-zinc-950/85 border border-zinc-800/80 space-y-2.5 text-[11px]">
                  <div className="font-mono text-[10px] uppercase text-zinc-400 font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3 w-3" /> Sources
                    </span>
                    <span className="text-emerald-400">Vérifié</span>
                  </div>

                  {uniqueSources.some(s => s.workspace_id && s.workspace_id !== activeWorkspaceId) && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200/80 text-[10px] mb-2 animate-in fade-in duration-500">
                      <ExternalLink className="h-3 w-3 text-amber-400" />
                      <span>Certaines sources proviennent de workspaces externes.</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {uniqueSources.map((src, i) => (
                      <div
                        key={i}
                        className="w-full text-left p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800/80 transition-all hover:border-zinc-700/80"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                            {src.type === "document" ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/20 shrink-0">
                                {src.file_extension || "DOC"}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                                WIKI
                              </span>
                            )}
                            <span className="font-medium text-zinc-200 truncate">{src.title}</span>
                          </div>
                          {(src.location || src.type === "document" || src.page) && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 shrink-0">
                              {sourceLocation(src)}
                            </span>
                          )}
                        </div>

                        {src.excerpt && (
                          <div className="mb-2">
                            <p className="text-[10px] leading-relaxed text-zinc-400 whitespace-pre-wrap font-mono bg-black/30 p-2 rounded border border-zinc-800/50 italic max-h-40 overflow-y-auto">
                              « {src.excerpt} »
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-2">
                          {src.workspace_id && src.workspace_id !== activeWorkspaceId ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400 text-zinc-950 border border-amber-300 text-[10px] font-bold shrink-0 shadow-sm" title={`Provenance : ${workspaces.find(w => w.id === src.workspace_id)?.name || "Workspace externe"}`}>
                              <ExternalLink className="h-2.5 w-2.5" />
                              <span>{workspaces.find(w => w.id === src.workspace_id)?.name || "Ext"}</span>
                            </div>
                          ) : (
                            <div className="w-16" />
                          )}

                          {src.type === "document" ? (
                            <button
                              onClick={() => onOpenDoc(src.id)}
                              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-medium text-[10px]"
                            >
                              <Layers className="h-3 w-3" />
                              <span>Fiche d'index</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenWiki(src.id)}
                              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-medium text-[10px]"
                            >
                              <BookOpen className="h-3 w-3" />
                              <span>Ouvrir la fiche Wiki</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
            <span>Analyse des sources en cours...</span>
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
            placeholder="Posez une question sur vos cours..."
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
