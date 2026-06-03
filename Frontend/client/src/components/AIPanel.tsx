import { WikiDocument } from '@/types/wiki';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sparkles, Send, FileText, X } from 'lucide-react';
import { useState } from 'react';
import { Streamdown } from 'streamdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: { docId: string; title: string; relevance: number }[];
}

interface AIPanelProps {
  documents: WikiDocument[];
  onClose: () => void;
}

export function AIPanel({ documents, onClose }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you search and understand your knowledge base. Ask me anything about your documents!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I found information about "${input}" in your knowledge base. Based on the documents, here's what I found:\n\n**Key Points:**\n- This is a simulated response\n- The AI panel indexes all your Markdown documents\n- You can ask questions and get AI-powered answers\n\nWould you like to know more?`,
        timestamp: new Date(),
        sources: [
          { docId: 'doc-1-1', title: 'Getting Started', relevance: 95 },
          { docId: 'doc-1-2', title: 'API Reference', relevance: 78 },
        ],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="w-96 bg-background border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-primary" />
          <h2 className="font-semibold text-foreground">AI Assistant</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-1 h-auto"
        >
          <X size={16} />
        </Button>
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
              <div className="text-sm">
                <Streamdown>{message.content}</Streamdown>
              </div>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                  <p className="text-xs font-semibold opacity-70">Sources:</p>
                  {message.sources.map((source) => (
                    <div
                      key={source.docId}
                      className="text-xs opacity-80 flex items-center gap-1"
                    >
                      <FileText size={12} />
                      <span>{source.title}</span>
                      <span className="opacity-60">({source.relevance}%)</span>
                    </div>
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
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about your docs..."
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
