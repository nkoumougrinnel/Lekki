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
  User,
  Layers,
  FileText,
  Check,
} from "lucide-react";

interface LekkiAIPanelProps {
  open: boolean;
  onClose: () => void;
  onOpenDoc: (docId: string) => void;
  onOpenWiki: (wikiId: string) => void;
  initialQuestion?: string;
}

/* -------------------------------------------------------
   FORMATTAGE DES RÉPONSES
   Convertit le Markdown courant en texte naturellement lisible.
   Aucune bibliothèque supplémentaire n'est nécessaire.
------------------------------------------------------- */

function formatAnswer(value: string | null | undefined): string {
  if (typeof value !== "string") return "";

  return value
    // Normaliser les retours à la ligne
    .replace(/\r\n/g, "\n")

    // Retirer les délimiteurs de blocs de code, conserver leur contenu
    .replace(/```[\w-]*\n?/g, "")
    .replace(/```/g, "")

    // Transformer les titres Markdown en texte simple
    .replace(/^#{1,6}\s+/gm, "")

    // Retirer les séparateurs horizontaux
    .replace(/^\s*(?:---+|___+|\*\*\*+)\s*$/gm, "")

    // Transformer les listes en puces lisibles
    .replace(/^\s*[-+*]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (match) => match.trim() + " ")

    // Liens Markdown : conserver le texte du lien
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")

    // Images Markdown : conserver leur description
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")

    // Retirer le formatage gras et italique
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .replace(/__([\s\S]*?)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1")

    // Retirer les délimiteurs de code inline
    .replace(/`([^`]+)`/g, "$1")

    // Nettoyer les espaces inutiles
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* -------------------------------------------------------
   ANIMATION DU TEXTE
   Les sources ne sont pas affichées par ce composant.
------------------------------------------------------- */

function TypingText({
  text,
  onComplete,
}: {
  text: string;
  onComplete: () => void;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDisplayedText("");
    setIndex(0);
    finishedRef.current = false;
  }, [text]);

  useEffect(() => {
    if (index >= text.length) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onCompleteRef.current();
      }
      return;
    }

    const timeout = window.setTimeout(() => {
      setDisplayedText(text.slice(0, index + 1));
      setIndex((current) => current + 1);
    }, 8);

    return () => window.clearTimeout(timeout);
  }, [index, text]);

  return (
    <span className="whitespace-pre-wrap break-words">
      {displayedText}
      {index < text.length && (
        <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] animate-pulse bg-[#2E7D5B]" />
      )}
    </span>
  );
}

/* -------------------------------------------------------
   SOURCE DOCUMENTAIRE
------------------------------------------------------- */

function cleanLocation(location: string): string {
  if (!location) return "";

  const pageMatch = location.match(/(p\.\s*\d+|page\s*\d+)/i);

  if (pageMatch) return pageMatch[0];

  const parts = location.split(",");

  return parts[parts.length - 1].trim();
}

function getSourceLocation(source: LekkiAISource): string {
  if (source.type === "document") {
    return source.page
      ? `Page ${source.page}`
      : source.location
        ? cleanLocation(source.location)
        : "Document";
  }

  return source.location ? cleanLocation(source.location) : "Wiki";
}

function SourceCard({
  source,
  activeWorkspaceId,
  workspaces,
  onOpenDoc,
  onOpenWiki,
}: {
  source: LekkiAISource;
  activeWorkspaceId?: string;
  workspaces: { id: string; name: string }[];
  onOpenDoc: (id: string) => void;
  onOpenWiki: (id: string) => void;
}) {
  const isDocument = source.type === "document";
  const isExternal =
    !!source.workspace_id && source.workspace_id !== activeWorkspaceId;

  const workspaceName = isExternal
    ? workspaces.find((workspace) => workspace.id === source.workspace_id)
        ?.name || "Autre espace"
    : null;

  return (
    <div className="group rounded-2xl border border-[#E5E9DC] bg-white p-3 transition-colors hover:border-[#D9DFD2] hover:shadow-[0_1px_3px_rgba(60,64,67,0.08)]">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isDocument
              ? "bg-[#E7F1E9] text-[#2E7D5B]"
              : "bg-[#E7F1E9] text-[#2E7D5B]"
          }`}
        >
          {isDocument ? (
            <FileText className="h-4 w-4" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="break-words text-[13px] font-medium leading-5 text-[#16241D]">
              {source.title}
            </p>

            <span className="shrink-0 rounded-md bg-[#F1F0E9] px-1.5 py-1 text-[10px] text-[#5C6B62]">
              {getSourceLocation(source)}
            </span>
          </div>

          <p className="mt-1 text-[11px] text-[#5C6B62]">
            {isDocument
              ? source.file_extension?.toUpperCase() || "Document"
              : "Page Wiki"}
          </p>

          {source.excerpt && (
            <p className="mt-2 line-clamp-3 border-l-2 border-[#2E7D5B]/20 pl-2.5 text-xs leading-relaxed text-[#5C6B62]">
              {source.excerpt}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {workspaceName ? (
              <span
                title={`Source issue de ${workspaceName}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#E7F1E9] px-2 py-1 text-[10px] text-[#2E7D5B]"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{workspaceName}</span>
              </span>
            ) : (
              <span />
            )}

            <button
              onClick={() =>
                isDocument
                  ? onOpenDoc(source.id)
                  : onOpenWiki(source.id)
              }
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-[#2E7D5B] transition-colors hover:bg-[#E7F1E9]"
            >
              {isDocument ? (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  Ouvrir le document
                </>
              ) : (
                <>
                  <BookOpen className="h-3.5 w-3.5" />
                  Ouvrir le Wiki
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   PANNEAU PRINCIPAL
------------------------------------------------------- */

export function LekkiAIPanel({
  open,
  onClose,
  onOpenDoc,
  onOpenWiki,
  initialQuestion,
}: LekkiAIPanelProps) {
  const { activeWorkspaceId, workspaces } = useWorkspace();

  const [messages, setMessages] = useState<LekkiAIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastAnimatedId, setLastAnimatedId] = useState<string | null>(null);
  const [completedMessages, setCompletedMessages] = useState<Set<string>>(
    new Set()
  );
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialQuestionRef = useRef<string | undefined>(undefined);

  const safeMessages = Array.isArray(messages) ? messages : [];

  const suggestedQuestions = [
    "Quelles matières sont couvertes dans cet espace ?",
    "Quels sont les points clés du dernier cours ajouté ?",
    "Retrouve les sujets qui parlent de…",
    "Explique-moi une notion du cours avec un exemple",
  ];

  /* Charger l'historique à l'ouverture */

  // Échap ferme le panneau, comme les autres fenêtres de l'app.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    aiApi
      .history()
      .then((history) => {
        if (cancelled) return;

        const normalizedHistory = Array.isArray(history)
          ? history.map((message) => ({
              ...message,
              content:
                typeof message?.content === "string" ? message.content : "",
              sources: Array.isArray(message?.sources) ? message.sources : [],
            }))
          : [];

        setMessages(normalizedHistory);
        setLastAnimatedId(null);
        setCompletedMessages(new Set());
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Impossible de charger l'historique.");
        }
      });

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open]);

  /* Question transmise par un autre composant */

  useEffect(() => {
    if (!open || !initialQuestion?.trim()) return;

    if (initialQuestionRef.current === initialQuestion) return;

    initialQuestionRef.current = initialQuestion;
    void handleAsk(initialQuestion);
  }, [open, initialQuestion]);

  /* Défilement automatique */

  useEffect(() => {
    scrollRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading, completedMessages]);

  if (!open) return null;

  /* Envoyer une question */

  async function handleAsk(questionText: string) {
    const question = questionText.trim();

    if (!question || loading) return;

    const userMessage: LekkiAIChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      created_at: new Date().toISOString(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setLoading(true);
    setLastAnimatedId(null);

    try {
      const response = await aiApi.ask(
        question,
        activeWorkspaceId || undefined
      );

      const assistantMessage: LekkiAIChatMessage = {
        id: response.message_id || `assistant-${Date.now()}`,
        role: "assistant",
        content:
          typeof response.answer === "string" ? response.answer : "",
        sources: Array.isArray(response.sources) ? response.sources : [],
        contradiction: response.contradiction || undefined,
        provider: response.provider,
        created_at: new Date().toISOString(),
      };

      setMessages((previous) => [...previous, assistantMessage]);
      setLastAnimatedId(assistantMessage.id);
    } catch {
      toast.error("Erreur lors de l'interrogation de Lekki AI.");
    } finally {
      setLoading(false);
    }
  }

  /* Terminer l'animation d'une réponse */

  function completeMessage(messageId: string) {
    setCompletedMessages((previous) => {
      const next = new Set(previous);
      next.add(messageId);
      return next;
    });
  }

  /* Effacer l'historique */

  async function handleClearHistory() {
    try {
      await aiApi.clearHistory();

      setMessages([]);
      setCompletedMessages(new Set());
      setLastAnimatedId(null);
      setShowClearConfirmation(false);

      toast.success("Conversation réinitialisée.");
    } catch {
      toast.error("Impossible de réinitialiser l'historique.");
    }
  }

  return (
    <div
      id="lekki-ai-panel-overlay"
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col overflow-hidden border-l border-[#E5E9DC] bg-white shadow-2xl animate-in slide-in-from-right duration-200 sm:w-[480px]"
    >
      {/* EN-TÊTE */}

      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#E5E9DC] px-5">
        <div className="flex items-center gap-3">
          <img
            src="/lekki-ai-logo.png"
            alt="Lekki AI"
            className="h-9 w-9 object-contain"
          />

          <div>
            <h2 className="text-sm font-medium tracking-tight text-[#16241D]">
              Lekki AI
            </h2>
            <p className="mt-0.5 text-[11px] text-[#5C6B62]">
              Répond à partir de tes documents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowClearConfirmation(true)}
            disabled={loading || messages.length === 0}
            title="Effacer la conversation"
            aria-label="Effacer la conversation"
            className="rounded-full p-2.5 text-[#5C6B62] transition-colors hover:bg-[#F1F0E9] hover:text-[#16241D] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={onClose}
            title="Fermer"
            aria-label="Fermer Lekki AI"
            className="rounded-full p-2.5 text-[#5C6B62] transition-colors hover:bg-[#F1F0E9] hover:text-[#16241D]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* CONFIRMATION D'EFFACEMENT */}

      {showClearConfirmation && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5E9DC] bg-white p-5 shadow-2xl">
            <h3 className="text-sm font-medium text-[#16241D]">
              Réinitialiser la conversation ?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-[#5C6B62]">
              L'historique de cette conversation sera effacé.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirmation(false)}
                className="rounded-full px-4 py-2 text-xs font-medium text-[#5C6B62] transition-colors hover:bg-[#F1F0E9] hover:text-[#16241D]"
              >
                Annuler
              </button>

              <button
                onClick={handleClearHistory}
                className="rounded-full bg-[#d93025]/10 px-4 py-2 text-xs font-medium text-[#d93025] transition-colors hover:bg-[#d93025]/20"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONVERSATION */}

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-2xl space-y-7 px-5 py-6">
          {/* ÉCRAN D'ACCUEIL */}

          {safeMessages.length === 0 && !loading && (
            <div className="flex min-h-[min(60vh,520px)] flex-col justify-center py-4">
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2E7D5B]/15 bg-[#E7F1E9]">
                  <Sparkles className="h-5 w-5 text-[#2E7D5B]" />
                </div>

                <h3 className="text-xl font-medium tracking-tight text-[#16241D]">
                  Que veux-tu comprendre ?
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#5C6B62]">
                  Pose ta question : Lekki AI répond à partir des cours, des sujets
                  et des fiches de ton espace, en citant ses sources.
                </p>
              </div>

              <div className="space-y-2">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#8A968E]">
                  Pour commencer
                </p>

                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => void handleAsk(question)}
                    className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-[#E5E9DC] bg-[#FBFAF6] px-4 py-3.5 text-left text-[13px] leading-relaxed text-[#3E4641] transition-all hover:border-[#2E7D5B]/20 hover:bg-[#F5F8F3] hover:text-[#2E7D5B]"
                  >
                    <span>{question}</span>

                    <span className="shrink-0 text-[#8A968E] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2E7D5B]">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MESSAGES */}

          {safeMessages.map((message) => {
            const isUser = message.role === "user";
            const isAnimated =
              !isUser &&
              message.id === lastAnimatedId &&
              !completedMessages.has(message.id);

            const formattedContent = isUser
              ? message.content
              : formatAnswer(message.content);

            const uniqueSources = message.sources
              ? Array.from(
                  new Map(
                    message.sources.map((source) => [source.id, source])
                  ).values()
                )
              : [];

            return (
              <article
                key={message.id}
                className={`flex flex-col ${
                  isUser ? "items-end" : "items-start"
                }`}
              >
                {/* IDENTITÉ */}

                <div
                  className={`mb-2 flex items-center gap-2 ${
                    isUser ? "flex-row-reverse" : ""
                  }`}
                >
                  {isUser ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F1F0E9]">
                      <User className="h-3 w-3 text-[#5C6B62]" />
                    </div>
                  ) : (
                    <img
                      src="/lekki-ai-logo.png"
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                  )}

                  <span
                    className={`text-xs font-medium ${
                      isUser ? "text-[#5C6B62]" : "text-[#16241D]"
                    }`}
                  >
                    {isUser ? "Toi" : "Lekki AI"}
                  </span>
                </div>

                {/* CONTENU DU MESSAGE */}

                <div
                  className={`max-w-[94%] text-[13px] leading-[1.85] sm:text-sm ${
                    isUser
                      ? "rounded-2xl rounded-tr-sm bg-[#E7F1E9] px-4 py-3 text-[#16241D]"
                      : "w-full pl-1 text-[#3E4641]"
                  }`}
                >
                  {isAnimated ? (
                    <TypingText
                      text={formattedContent}
                      onComplete={() => completeMessage(message.id)}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words">
                      {formattedContent}
                    </div>
                  )}
                </div>

                {/* MÉTADONNÉES ET SOURCES
                    Masquées tant que la réponse s'anime. */}

                {!isUser && !isAnimated && (
                  <div className="mt-4 w-full space-y-3">
                    {message.provider && (
                      <div className="text-[10px] text-[#8A968E]">
                        {message.provider.startsWith("Mode dégradé") ? (
                          <span className="text-[#d93025]/80">
                            Réponse en mode dégradé
                          </span>
                        ) : (
                          <span>Généré par {message.provider}</span>
                        )}
                      </div>
                    )}

                    {uniqueSources.length > 0 && (
                      <section className="pt-1">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5 text-[#2E7D5B]" />

                            <h4 className="text-xs font-medium text-[#3E4641]">
                              Sources utilisées
                            </h4>

                            <span className="rounded-md bg-[#F1F0E9] px-1.5 py-0.5 text-[10px] text-[#5C6B62]">
                              {uniqueSources.length}
                            </span>
                          </div>

                          <span className="flex items-center gap-1 text-[10px] text-[#8A968E]">
                            <Check className="h-3 w-3" />
                            Références
                          </span>
                        </div>

                        {uniqueSources.some(
                          (source) =>
                            source.workspace_id &&
                            source.workspace_id !== activeWorkspaceId
                        ) && (
                          <p className="mb-3 flex items-center gap-2 rounded-lg bg-[#E7F1E9] px-3 py-2 text-[11px] leading-relaxed text-[#2E7D5B]/80">
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            Certaines sources proviennent d'autres espaces
                            de travail.
                          </p>
                        )}

                        <div className="space-y-2">
                          {uniqueSources.map((source) => (
                            <SourceCard
                              key={`${source.type}-${source.id}`}
                              source={source}
                              activeWorkspaceId={activeWorkspaceId || undefined}
                              workspaces={workspaces}
                              onOpenDoc={onOpenDoc}
                              onOpenWiki={onOpenWiki}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {/* INDICATEUR DE RÉFLEXION */}

          {loading && (
            <div className="flex items-center gap-3 py-2">
              <img
                src="/lekki-ai-logo.png"
                alt=""
                className="h-6 w-6 object-contain"
              />

              <div className="flex items-center gap-2 text-xs text-[#5C6B62]">
                <span>Lekki AI lit tes documents</span>

                <span className="flex gap-1">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-[#2E7D5B] [animation-delay:-0.3s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-[#2E7D5B] [animation-delay:-0.15s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-[#2E7D5B]" />
                </span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </main>

      {/* SAISIE */}

      <footer className="shrink-0 border-t border-[#E5E9DC] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleAsk(input);
          }}
          className="mx-auto max-w-2xl"
        >
          <div className="group flex items-center gap-2 rounded-2xl border border-[#E5E9DC] bg-white p-1.5 transition-colors focus-within:border-[#2E7D5B]/30 focus-within:bg-white">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleAsk(input);
                }
              }}
              placeholder="Pose une question sur tes cours…"
              disabled={loading}
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[13px] text-[#16241D] outline-none placeholder:text-[#8A968E] disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Envoyer le message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2E7D5B] text-white transition-all hover:bg-[#246147] disabled:cursor-not-allowed disabled:bg-[#F1F0E9] disabled:text-[#8A968E]"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] text-[#8A968E]">
            Les réponses s'appuient sur les documents de ton espace.
          </p>
        </form>
      </footer>
    </div>
  );
}