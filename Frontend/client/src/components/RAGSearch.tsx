import { RAGResponse } from '@/types/wiki';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Search, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface RAGSearchProps {
  onSearch: (query: string) => void;
  response?: RAGResponse;
  isLoading?: boolean;
}

export function RAGSearch({ onSearch, response, isLoading }: RAGSearchProps) {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ask a question about your knowledge base..."
              className="pl-10 pr-4 py-3 text-base"
            />
            <Sparkles className="absolute left-3 top-3 text-emerald-600" size={18} />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
          >
            <Search size={18} className="mr-2" />
            Search
          </Button>
        </div>
        <p className="text-sm text-muted mt-2">
          Powered by RAG • AI-enhanced search across all documents
        </p>
      </div>

      {/* Response */}
      {response && (
        <div className="space-y-6">
          {/* Answer */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="text-emerald-600 flex-shrink-0 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">AI Response</h3>
                <p className="text-foreground leading-relaxed">{response.answer}</p>
              </div>
            </div>

            {/* Confidence Score */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted">Confidence Score</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {response.confidence}%
                </span>
              </div>
              <Progress
                value={response.confidence}
                className="h-2"
              />
            </div>
          </div>

          {/* Sources */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Sources</h3>
            <div className="space-y-3">
              {response.sources.map((source) => (
                <div
                  key={source.documentId}
                  className="bg-card rounded-lg p-4 border border-border hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        {source.title}
                        <ExternalLink size={14} className="text-muted" />
                      </h4>
                      <p className="text-sm text-muted mt-1">{source.excerpt}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold text-sapphire-600">
                        {source.relevance}% match
                      </div>
                      <Progress
                        value={source.relevance}
                        className="h-1 mt-2 w-16"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin">
            <Sparkles className="text-emerald-600" size={32} />
          </div>
          <span className="ml-4 text-muted">Searching your knowledge base...</span>
        </div>
      )}
    </div>
  );
}
