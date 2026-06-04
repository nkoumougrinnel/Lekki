import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, FileText, X, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';
import { rag, chats as chatsApi, ApiError, type AskSource } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { TypewriterMarkdown } from './TypewriterMarkdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AskSource[];
  confidence?: number;
  provider?: string | null;
  /** Anime la réponse en révélation progressive (effet « token par token »). */
  animate?: boolean;
}

interface AIPanelProps {
  onClose: () => void;
  onOpenSource?: (pageId: string) => void;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Bonjour ! Je suis Lekki AI. Posez-moi une question sur la base de connaissances.',
};

type ConfidenceTier = {
  label: string;
  text: string;
  badge: string;
  dot: string;
  bar: string;
};

function confidenceTier(value: number): ConfidenceTier {
  if (value >= 0.7) {
    return {
      label: 'Confiance élevée',
      text: 'text-emerald-700 dark:text-emerald-400',
      badge: 'bg-emerald-500/15',
      dot: 'bg-emerald-500',
      bar: 'bg-emerald-500',
    };
  }
  if (value >= 0.4) {
    return {
      label: 'Confiance moyenne',
      text: 'text-amber-700 dark:text-amber-400',
      badge: 'bg-amber-500/15',
      dot: 'bg-amber-500',
      bar: 'bg-amber-500',
    };
  }
  return {
    label: 'Confiance faible',
    text: 'text-rose-700 dark:text-rose-400',
    badge: 'bg-rose-500/15',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  };
}

function ConfidenceBadge({ value }: { value: number }) {
  const tier = confidenceTier(value);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tier.badge} ${tier.text}`}
      title={`Niveau de confiance : ${Math.round(value * 100)}%`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
      {tier.label} · {Math.round(value * 100)}%
    </span>
  );
}


export function AIPanel({ onClose, onOpenSource }: AIPanelProps) {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  // Ids des réponses dont l'animation « token par token » est terminée
  // (on ne dévoile les sources qu'une fois le texte entièrement écrit).
  const [typedDone, setTypedDone] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const markTyped = useCallback((id: string) => {
    setTypedDone((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Changer de workspace démarre une nouvelle conversation (mémoire cloisonnée).
  useEffect(() => {
    setChatId(null);
    setMessages([WELCOME]);
  }, [activeWorkspaceId]);

  const handleNewConversation = async () => {
    if (isLoading) return;
    const previous = chatId;
    setChatId(null);
    setMessages([WELCOME]);
    // Efface la mémoire côté serveur (best-effort).
    if (previous) {
      try {
        await chatsApi.clearContext(previous);
      } catch {
        /* non bloquant */
      }
    }
  };

  const handleSendMessage = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Conversation persistante : créée à la 1re question pour activer la mémoire.
      let currentChatId = chatId;
      if (!currentChatId) {
        const chat = await chatsApi.create(
          question.slice(0, 60),
          activeWorkspaceId ?? undefined,
        );
        currentChatId = chat.id;
        setChatId(chat.id);
      }

      const res = await rag.ask(question, {
        chatId: currentChatId,
        workspaceId: activeWorkspaceId ?? undefined,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          content: res.answer,
          sources: res.sources,
          confidence: res.confidence,
          provider: res.provider,
          animate: true,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Une erreur est survenue lors de l'interrogation de l'IA.";
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-e`, role: 'assistant', content: message },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 w-full flex flex-col h-full bg-background border-l border-border md:static md:inset-auto md:z-auto md:w-96">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Bot size={20} className="text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground leading-tight">Lekki AI</h2>
            {activeWorkspace && (
              <p className="text-xs text-muted-foreground truncate" title={activeWorkspace.name}>
                Workspace : {activeWorkspace.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewConversation}
            disabled={isLoading || messages.length <= 1}
            className="p-1 h-auto"
            title="Nouvelle conversation (efface le contexte)"
          >
            <RotateCcw size={15} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-auto">
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-lg p-3 ${
                message.role === 'user'
                  ? 'max-w-xs bg-primary text-primary-foreground'
                  : 'max-w-[90%] bg-secondary text-foreground'
              }`}
            >
              <div className="text-sm break-words">
                {message.role === 'assistant' && message.animate && !typedDone.has(message.id) ? (
                  <TypewriterMarkdown
                    text={message.content}
                    onDone={() => markTyped(message.id)}
                    onProgress={scrollToBottom}
                  />
                ) : (
                  <Streamdown>{message.content}</Streamdown>
                )}
              </div>

              {message.sources &&
                message.sources.length > 0 &&
                (!message.animate || typedDone.has(message.id)) && (
                  <div className="mt-3 space-y-2 border-t border-border/40 pt-3 duration-300 animate-in fade-in slide-in-from-bottom-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-60">
                        Sources · {message.sources.length}
                      </span>
                      {typeof message.confidence === 'number' && (
                        <ConfidenceBadge value={message.confidence} />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {message.sources.map((source) => {
                        const pct = Math.round(source.score * 100);
                        return (
                          <button
                            key={source.page_id}
                            type="button"
                            onClick={() => onOpenSource?.(source.page_id)}
                            disabled={!onOpenSource}
                            title="Ouvrir dans l'éditeur"
                            className="group/src w-full rounded-lg border border-border/50 bg-background/40 p-2 text-left transition-colors enabled:cursor-pointer enabled:hover:border-border enabled:hover:bg-background"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <FileText size={12} />
                              </span>
                              <span className="flex-1 truncate text-xs font-medium">
                                {source.title ?? 'Document'}
                              </span>
                              <span className="text-[10px] font-semibold tabular-nums opacity-70">
                                {pct}%
                              </span>
                            </div>
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border/60">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.max(4, pct)}%` }}
                              />
                            </div>
                            {source.excerpt && (
                              <p className="mt-1.5 line-clamp-2 text-[11px] italic opacity-70">
                                « {source.excerpt} »
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-foreground rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Posez une question sur vos docs..."
            className="text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-3"
            size="sm"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
