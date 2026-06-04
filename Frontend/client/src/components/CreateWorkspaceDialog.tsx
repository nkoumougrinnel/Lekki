import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { workspaces as workspacesApi, ApiError } from '@/lib/api';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (workspaceId: string) => void;
}

export function CreateWorkspaceDialog({ open, onOpenChange, onCreated }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const ws = await workspacesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success(`Workspace « ${ws.name} » créé`);
      reset();
      onOpenChange(false);
      onCreated(ws.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nouveau workspace</DialogTitle>
            <DialogDescription>
              Un workspace cloisonne ses pages et ses recherches IA. Vous en devenez propriétaire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Nom</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Ressources Humaines"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-desc">Description (optionnel)</Label>
              <Textarea
                id="ws-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="À quoi sert ce workspace ?"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving && <Loader2 size={16} className="animate-spin mr-1" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
