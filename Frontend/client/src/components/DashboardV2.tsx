import { WikiStats, WikiDocument } from '@/types/wiki';
import { Card } from '@/components/ui/card';
import { FileText, ArrowRight } from 'lucide-react';

interface DashboardV2Props {
  stats: WikiStats;
  onSelectDocument: (doc: WikiDocument) => void;
}

export function DashboardV2({ stats, onSelectDocument }: DashboardV2Props) {
  return (
    <div className="flex-1 bg-background overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border p-8">
        <h1 className="text-4xl font-bold text-foreground">Welcome to Lekki</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Your knowledge base powered by AI
        </p>
      </div>

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Recently Updated */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Recently Updated</h2>
          </div>
          <div className="space-y-3">
            {stats.recentlyUpdated.map((doc) => (
              <Card
                key={doc.id}
                className="p-4 border border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                onClick={() => onSelectDocument(doc)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Updated by {doc.author} • {doc.updatedAt.toLocaleDateString()}
                    </p>
                    {doc.tags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {doc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 bg-secondary text-muted-foreground rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <FileText className="text-muted-foreground flex-shrink-0" size={20} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
