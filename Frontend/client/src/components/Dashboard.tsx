import { WikiStats, WikiDocument } from '@/types/wiki';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Folder,
  Users,
  Clock,
  Star,
  ArrowRight,
} from 'lucide-react';

interface DashboardProps {
  stats: WikiStats;
  onSelectDocument: (doc: WikiDocument) => void;
}

export function Dashboard({ stats, onSelectDocument }: DashboardProps) {
  return (
    <div className="flex-1 bg-background overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-border p-8">
        <h1 className="text-4xl font-bold text-ink mb-2">Welcome to Lekki Wiki</h1>
        <p className="text-lg text-mist">
          Your knowledge base powered by AI-enhanced search
        </p>
      </div>

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Total Documents</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {stats.totalDocuments}
                </p>
              </div>
              <FileText className="text-emerald-600" size={32} />
            </div>
          </Card>

          <Card className="p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Folders</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {stats.totalFolders}
                </p>
              </div>
              <Folder className="text-sapphire-600" size={32} />
            </div>
          </Card>

          <Card className="p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Contributors</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {stats.contributorsCount}
                </p>
              </div>
              <Users className="text-amber-600" size={32} />
            </div>
          </Card>

          <Card className="p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Last Updated</p>
                <p className="text-lg font-bold text-foreground mt-2">Today</p>
              </div>
              <Clock className="text-rose-600" size={32} />
            </div>
          </Card>
        </div>

        {/* Recently Updated */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Recently Updated</h2>
            <Button variant="ghost" className="text-emerald-600">
              View All <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
          <div className="space-y-3">
            {stats.recentlyUpdated.map((doc) => (
              <Card
                key={doc.id}
                className="p-4 border border-border hover:border-emerald-300 hover:bg-emerald-50 transition-colors cursor-pointer"
                onClick={() => onSelectDocument(doc)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{doc.title}</h3>
                    <p className="text-sm text-muted mt-1">
                      Updated by {doc.author} • {doc.updatedAt.toLocaleDateString()}
                    </p>
                    {doc.tags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {doc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 bg-smoke text-muted rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <FileText className="text-muted flex-shrink-0" size={20} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Favorites */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Star className="text-amber-600" size={24} />
              Favorites
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.favorites.map((doc) => (
              <Card
                key={doc.id}
                className="p-6 border border-border hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => onSelectDocument(doc)}
              >
                <div className="flex items-start justify-between mb-3">
                  <Folder className="text-emerald-600" size={24} />
                  <Star className="text-amber-600 fill-amber-600" size={20} />
                </div>
                <h3 className="font-semibold text-foreground text-lg">{doc.title}</h3>
                <p className="text-sm text-muted mt-2">
                  {doc.isFolder ? 'Folder' : 'Document'} • {doc.children?.length || 0} items
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-emerald-50 to-sapphire-50 rounded-lg p-8 border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white py-6">
              + New Document
            </Button>
            <Button className="bg-sapphire-600 hover:bg-sapphire-700 text-white py-6">
              + New Folder
            </Button>
            <Button variant="outline" className="py-6">
              Search Knowledge Base
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
