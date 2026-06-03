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
} from 'lucide-react';
import { useState } from 'react';
import { Streamdown } from 'streamdown';

interface MarkdownEditorProps {
  document: WikiDocument;
  onSave: (content: string) => void;
}

export function MarkdownEditor({ document, onSave }: MarkdownEditorProps) {
  const [content, setContent] = useState(document.content);
  const [isSaved, setIsSaved] = useState(true);

  const handleSave = () => {
    onSave(content);
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
    <div className="flex flex-col h-screen flex-1 bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{document.title}</h2>
          <p className="text-sm text-muted mt-1">
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save size={16} className="mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-border p-3 flex items-center gap-2 bg-smoke flex-wrap">
        <button
          onClick={() => insertMarkdown('**', '**')}
          className="p-2 hover:bg-white rounded transition-colors"
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => insertMarkdown('*', '*')}
          className="p-2 hover:bg-white rounded transition-colors"
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <div className="w-px h-6 bg-border" />
        <button
          onClick={() => insertMarkdown('# ')}
          className="p-2 hover:bg-white rounded transition-colors"
          title="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          onClick={() => insertMarkdown('## ')}
          className="p-2 hover:bg-white rounded transition-colors"
          title="Heading 2"
        >
          <Heading2 size={16} />
        </button>
        <div className="w-px h-6 bg-border" />
        <button
          onClick={() => insertMarkdown('- ')}
          className="p-2 hover:bg-white rounded transition-colors"
          title="List"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => insertMarkdown('`', '`')}
          className="p-2 hover:bg-white rounded transition-colors"
          title="Code"
        >
          <Code size={16} />
        </button>
        <button
          onClick={() => insertMarkdown('[', '](url)')}
          className="p-2 hover:bg-white rounded transition-colors"
          title="Link"
        >
          <Link size={16} />
        </button>
      </div>

      {/* Editor & Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-muted">Edit</h3>
          </div>
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsSaved(false);
            }}
            className="flex-1 p-4 font-mono text-sm resize-none border-0 focus:ring-0"
            placeholder="Write your markdown here..."
          />
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-muted">Preview</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="prose prose-sm max-w-none">
              <Streamdown>{content}</Streamdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
