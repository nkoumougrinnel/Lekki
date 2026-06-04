import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { UploadCloud, FileText, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { imports as importsApi, ApiError, type ImportJob, type PageCategory } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const ACCEPTED = '.pdf,.docx,.txt,.md,.markdown';
const TERMINAL: ImportJob['status'][] = ['completed', 'partial', 'failed'];

const CATEGORIES: { value: PageCategory; label: string }[] = [
  { value: 'guides', label: 'Guides' },
  { value: 'rh', label: 'RH' },
  { value: 'technique', label: 'Technique' },
  { value: 'commercial', label: 'Commercial' },
];

function isSupported(name: string): boolean {
  return /\.(pdf|docx|txt|md|markdown)$/i.test(name);
}

export function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<PageCategory>('guides');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => {
    setFiles([]);
    setJob(null);
    setUploading(false);
    setCategory('guides');
  };

  // Nettoyage du polling à la fermeture / démontage.
  useEffect(() => {
    if (!open) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      reset();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open]);

  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming).filter((f) => isSupported(f.name));
    const rejected = Array.from(incoming).length - next.length;
    if (rejected > 0) toast.error(`${rejected} fichier(s) ignoré(s) : format non supporté.`);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...next.filter((f) => !seen.has(f.name + f.size))];
    });
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const startPolling = (id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await importsApi.get(id);
        setJob(fresh);
        if (TERMINAL.includes(fresh.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setUploading(false);
          onImported();
          if (fresh.status === 'completed') {
            toast.success(`Import terminé : ${fresh.processed_files} page(s) créée(s).`);
          } else if (fresh.status === 'partial') {
            toast.warning(`Import partiel : ${fresh.processed_files}/${fresh.total_files} fichier(s).`);
          } else {
            toast.error('Import échoué. Consultez le détail des erreurs.');
          }
        }
      } catch {
        // On laisse le polling réessayer au prochain tick.
      }
    }, 1200);
  };

  const handleUpload = async () => {
    if (!activeWorkspaceId) {
      toast.error("Sélectionnez d'abord un workspace.");
      return;
    }
    if (files.length === 0) return;
    setUploading(true);
    try {
      const created = await importsApi.create(files, activeWorkspaceId, category);
      setJob(created);
      if (TERMINAL.includes(created.status)) {
        setUploading(false);
        onImported();
      } else {
        startPolling(created.id);
      }
    } catch (err) {
      setUploading(false);
      toast.error(err instanceof ApiError ? err.message : 'Import impossible.');
    }
  };

  const finished = job && TERMINAL.includes(job.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer des documents</DialogTitle>
          <DialogDescription>
            PDF, DOCX, TXT ou Markdown — vers le workspace «{' '}
            {activeWorkspace?.name ?? '—'} ». Chaque fichier devient une page consultable par
            l'IA.
          </DialogDescription>
        </DialogHeader>

        {!job && (
          <div className="space-y-4">
            {/* Zone de dépôt */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'
              }`}
            >
              <UploadCloud size={28} className="text-muted-foreground" />
              <p className="text-sm text-foreground font-medium">
                Glissez vos fichiers ici ou cliquez pour parcourir
              </p>
              <p className="text-xs text-muted-foreground">PDF · DOCX · TXT · Markdown</p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Liste des fichiers sélectionnés */}
            {files.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {files.map((f, idx) => (
                  <div
                    key={f.name + f.size}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-sm"
                  >
                    <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(f.size / 1024).toFixed(0)} Ko
                    </span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="p-0.5 rounded hover:bg-background text-muted-foreground"
                      title="Retirer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Catégorie */}
            <div className="space-y-2">
              <Label>Catégorie des pages créées</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PageCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Progression */}
        {job && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              {finished ? (
                job.status === 'completed' ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-500" />
                )
              ) : (
                <Loader2 size={18} className="animate-spin text-primary" />
              )}
              <span className="text-sm font-medium capitalize">{job.status}</span>
              <span className="ml-auto text-sm text-muted-foreground">
                {job.processed_files}/{job.total_files} fichier(s)
              </span>
            </div>

            <Progress value={job.progress} />

            {job.error_log && (
              <div className="rounded-md bg-destructive/10 text-destructive text-xs p-3 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {job.error_log}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {finished ? (
            <Button onClick={() => onOpenChange(false)}>Fermer</Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={uploading}
              >
                Annuler
              </Button>
              <Button onClick={handleUpload} disabled={files.length === 0 || uploading || !!job}>
                {uploading && <Loader2 size={16} className="animate-spin mr-1" />}
                Importer {files.length > 0 ? `(${files.length})` : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
