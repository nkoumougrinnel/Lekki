import { WikiDocument } from '@/types/wiki';
import { Card } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface DashboardV2Props {
  documents: WikiDocument[];
  onSelectDocument: (doc: WikiDocument) => void;
}

export function DashboardV2({ documents, onSelectDocument }: DashboardV2Props) {
  const recentlyUpdated = [...documents]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 8);

  return (
    <div className="flex-1 bg-background overflow-y-auto">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border p-8">
        <h1 className="text-4xl font-bold text-foreground">Bienvenue sur Lekki</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Votre base de connaissances augmentée par l'IA · {documents.length} page
          {documents.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Récemment mises à jour</h2>
          </div>

          {recentlyUpdated.length === 0 ? (
            <p className="text-muted-foreground">
              Aucune page pour l'instant. Créez-en une depuis la barre latérale.
            </p>
          ) : (
            <div className="space-y-3">
              {recentlyUpdated.map((doc) => (
                <Card
                  key={doc.id}
                  className="p-4 border border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => onSelectDocument(doc)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {doc.author} · {doc.updatedAt.toLocaleDateString()}
                        {doc.category ? ` · ${doc.category}` : ''}
                      </p>
                    </div>
                    <FileText className="text-muted-foreground flex-shrink-0" size={20} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
