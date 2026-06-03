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
} from 'lucide-react';
import { useState } from 'react';
import { Streamdown } from 'streamdown';

interface MarkdownEditorV2Props {
  document: WikiDocument;
  onSave: (content: string, title: string) => void;
}

export function MarkdownEditorV2({ document, onSave }: MarkdownEditorV2Props) {
  const [content, setContent] = useState(document.content);
  const [title, setTitle] = useState(document.title);
  const [isSaved, setIsSaved] = useState(true);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

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
            placeholder="Document title"
            aria-label="Document title"
            className="w-full text-2xl font-bold text-foreground bg-transparent border-0 outline-none focus:ring-0 p-0 hover:bg-secondary/50 focus:bg-secondary/50 rounded px-1 -mx-1 transition-colors"
          />
          <p className="text-sm text-muted-foreground mt-1 px-1">
            Last updated by {document.author} • {document.updatedAt.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isSaved && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <Clock size={14} /> Unsaved
            </span>
          )}
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save size={16} className="mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Toolbar & View Toggle */}
      <div className="border-b border-border p-3 flex items-center justify-between bg-secondary flex-wrap">
        {/* Toolbar */}
        {viewMode === 'edit' && (
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

      {/* Editor or Preview */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'edit' ? (
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsSaved(false);
            }}
            className="w-full h-full p-4 font-mono text-sm resize-none border-0 focus:ring-0"
            placeholder="Write your markdown here..."
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
