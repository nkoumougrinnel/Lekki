import { WikiDocument } from '@/types/wiki';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Code,
  Link,
  Save,
  Clock,
  Eye,
  FileText,
  Sparkles,
  RefreshCw,
  Loader2,
  X,
  Link2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Streamdown } from 'streamdown';
import { toast } from 'sonner';
import { pages as pagesApi, ApiError, type PageSummary, type RelatedPage } from '@/lib/api';

interface MarkdownEditorV2Props {
  document: WikiDocument;
  onSave: (content: string, title: string) => void;
  onOpenRelated?: (pageId: string) => void;
  readOnly?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  rh: 'RH',
  technique: 'Technique',
  commercial: 'Commercial',
  guides: 'Guides',
};

export function MarkdownEditorV2({
  document,
  onSave,
  onOpenRelated,
  readOnly = false,
}: MarkdownEditorV2Props) {
  const [content, setContent] = useState(document.content);
  const [title, setTitle] = useState(document.title);
  const [isSaved, setIsSaved] = useState(true);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>(readOnly ? 'preview' : 'edit');

  const [summary, setSummary] = useState<PageSummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [related, setRelated] = useState<RelatedPage[]>([]);

  // Charge un éventuel résumé existant à l'ouverture de la page.
  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setShowSummary(false);
    pagesApi
      .summary(document.id)
      .then((res) => {
        if (!cancelled && res.summary) {
          setSummary(res);
          setShowSummary(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [document.id]);

  // Charge les pages liées (voisins sémantiques) à l'ouverture.
  useEffect(() => {
    let cancelled = false;
    setRelated([]);
    pagesApi
      .related(document.id, 5)
      .then((res) => {
        if (!cancelled) setRelated(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [document.id]);

  const handleSummarize = async (force = false) => {
    if (summarizing) return;
    setSummarizing(true);
    setShowSummary(true);
    try {
      const res = await pagesApi.summarize(document.id, force);
      setSummary(res);
      toast.success(res.cached ? 'Résumé existant chargé.' : 'Résumé généré.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Résumé impossible.');
      if (!summary) setShowSummary(false);
    } finally {
      setSummarizing(false);
    }
  };

  const handleSave = () => {
    onSave(content, title);
    setIsSaved(true);
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = globalThis.document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newContent);
    setIsSaved(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  return (
    <div className="flex flex-col h-full flex-1 bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsSaved(false);
            }}
            readOnly={readOnly}
            placeholder="Titre du document"
            aria-label="Titre du document"
            className={`w-full text-2xl font-bold text-foreground bg-transparent border-0 outline-none focus:ring-0 p-0 rounded px-1 -mx-1 transition-colors ${
              readOnly ? '' : 'hover:bg-secondary/50 focus:bg-secondary/50'
            }`}
          />
          <p className="text-sm text-muted-foreground mt-1 px-1">
            Modifié par {document.author} • {document.updatedAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && !isSaved && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <Clock size={14} /> Non enregistré
            </span>
          )}
          <Button
            variant="outline"
            onClick={() => handleSummarize(false)}
            disabled={summarizing}
            title="Générer un résumé TL;DR avec l'IA"
          >
            {summarizing ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Sparkles size={16} className="mr-2" />
            )}
            Résumer cette page
          </Button>
          {!readOnly && (
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save size={16} className="mr-2" />
              Enregistrer
            </Button>
          )}
        </div>
      </div>

      {/* Résumé TL;DR */}
      {showSummary && (
        <div className="border-b border-border bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={15} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">TL;DR</span>
            {summary?.summary_at && (
              <span className="text-xs text-muted-foreground">
                · {new Date(summary.summary_at).toLocaleString()}
                {summary.provider ? ` · ${summary.provider}` : ''}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => handleSummarize(true)}
                disabled={summarizing}
                className="p-1 rounded hover:bg-background text-muted-foreground transition-colors disabled:opacity-50"
                title="Régénérer le résumé"
              >
                <RefreshCw size={14} className={summarizing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setShowSummary(false)}
                className="p-1 rounded hover:bg-background text-muted-foreground transition-colors"
                title="Masquer"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          {summarizing && !summary ? (
            <p className="text-sm text-muted-foreground italic">Génération du résumé…</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
              <Streamdown>{summary?.summary ?? ''}</Streamdown>
            </div>
          )}
        </div>
      )}

      {/* Toolbar & View Toggle */}
      <div className="border-b border-border p-3 flex items-center justify-between bg-secondary flex-wrap">
        {/* Toolbar */}
        {viewMode === 'edit' && !readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => insertMarkdown('**', '**')}
              className="p-2 hover:bg-background rounded transition-colors"
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('*', '*')}
              className="p-2 hover:bg-background rounded transition-colors"
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <div className="w-px h-6 bg-border" />
            <button
              onClick={() => insertMarkdown('# ')}
              className="p-2 hover:bg-background rounded transition-colors"
              title="Heading 1"
            >
              <Heading1 size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('## ')}
              className="p-2 hover:bg-background rounded transition-colors"
              title="Heading 2"
            >
              <Heading2 size={16} />
            </button>
            <div className="w-px h-6 bg-border" />
            <button
              onClick={() => insertMarkdown('- ')}
              className="p-2 hover:bg-background rounded transition-colors"
              title="List"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('`', '`')}
              className="p-2 hover:bg-background rounded transition-colors"
              title="Code"
            >
              <Code size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('[', '](url)')}
              className="p-2 hover:bg-background rounded transition-colors"
              title="Link"
            >
              <Link size={16} />
            </button>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={viewMode === 'edit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('edit')}
            className="gap-2"
          >
            <FileText size={16} />
            Edit
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('preview')}
            className="gap-2"
          >
            <Eye size={16} />
            Preview
          </Button>
        </div>
      </div>

      {/* Pages liées (voisins sémantiques) */}
      {related.length > 0 && (
        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Link2 size={13} /> Pages liées
            </span>
            {related.map((r) => (
              <button
                key={r.page_id}
                onClick={() => onOpenRelated?.(r.page_id)}
                disabled={!onOpenRelated}
                title={`Similarité ${Math.round(r.score * 100)}%`}
                className="group flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs transition-colors enabled:hover:bg-secondary enabled:hover:border-primary/40 disabled:opacity-70"
              >
                <span className="font-medium text-foreground max-w-[180px] truncate">
                  {r.title}
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  {CATEGORY_LABELS[r.category] ?? r.category}
                </span>
                <span className="text-[10px] font-semibold text-primary">
                  {Math.round(r.score * 100)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor or Preview */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'edit' ? (
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsSaved(false);
            }}
            readOnly={readOnly}
            className="w-full h-full p-4 font-mono text-sm resize-none border-0 focus:ring-0"
            placeholder="Écrivez votre markdown ici..."
          />
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <Streamdown>{content || '*Nothing to preview yet. Switch to Edit and start writing.*'}</Streamdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
