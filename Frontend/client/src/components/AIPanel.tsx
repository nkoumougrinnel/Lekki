import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, FileText, X, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';
import { rag, chats as chatsApi, ApiError, type AskSource } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AskSource[];
  confidence?: number;
  provider?: string | null;
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

export function AIPanel({ onClose, onOpenSource }: AIPanelProps) {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
    <div className="w-96 bg-background border-l border-border flex flex-col h-full">
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
              className={`max-w-xs rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
              }`}
            >
              <div className="text-sm break-words">
                <Streamdown>{message.content}</Streamdown>
              </div>

              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                  <p className="text-xs font-semibold opacity-70">
                    Sources
                    {typeof message.confidence === 'number' && (
                      <span className="font-normal">
                        {' '}
                        · confiance {Math.round(message.confidence * 100)}%
                      </span>
                    )}
                  </p>
                  {message.sources.map((source) => (
                    <button
                      key={source.page_id}
                      type="button"
                      onClick={() => onOpenSource?.(source.page_id)}
                      disabled={!onOpenSource}
                      title="Ouvrir dans l'éditeur"
                      className="w-full text-left text-xs opacity-80 -mx-1.5 rounded-md px-1.5 py-1 transition-colors enabled:cursor-pointer enabled:hover:bg-background/60 enabled:hover:opacity-100"
                    >
                      <div className="flex items-center gap-1 font-medium">
                        <FileText size={12} className="flex-shrink-0" />
                        <span className="flex-1 truncate">{source.title ?? 'Document'}</span>
                        <span className="opacity-60">{Math.round(source.score * 100)}%</span>
                      </div>
                      {source.excerpt && (
                        <p className="mt-0.5 pl-4 opacity-70 italic">« {source.excerpt} »</p>
                      )}
                    </button>
                  ))}
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
