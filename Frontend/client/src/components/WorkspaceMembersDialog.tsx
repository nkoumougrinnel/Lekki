import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, UserPlus, Crown } from 'lucide-react';
import { toast } from 'sonner';
import {
  workspaces as workspacesApi,
  users as usersApi,
  ApiError,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceRole,
  type ApiUser,
} from '@/lib/api';

interface WorkspaceMembersDialogProps {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceMembersDialog({
  workspace,
  open,
  onOpenChange,
}: WorkspaceMembersDialogProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [allUsers, setAllUsers] = useState<ApiUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const list = await workspacesApi.members(workspace.id);
      setMembers(list);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Chargement des membres impossible.');
    } finally {
      setLoading(false);
    }
    // La liste complète des utilisateurs n'est accessible qu'aux admins globaux.
    try {
      const u = await usersApi.list();
      setAllUsers(u);
    } catch {
      setAllUsers(null);
    }
  }, [workspace]);

  useEffect(() => {
    if (open) {
      setSelectedUserId('');
      setManualUserId('');
      setRole('member');
      load();
    }
  }, [open, load]);

  const usernameFor = (userId: string): string => {
    const u = allUsers?.find((x) => x.id === userId);
    return u ? `${u.username} (${u.email})` : userId;
  };

  const memberIds = new Set(members.map((m) => m.user_id));
  const candidates = allUsers?.filter((u) => !memberIds.has(u.id)) ?? [];

  const handleAdd = async () => {
    if (!workspace) return;
    const userId = (allUsers ? selectedUserId : manualUserId).trim();
    if (!userId) {
      toast.error('Sélectionnez un utilisateur (ou saisissez son ID).');
      return;
    }
    setSubmitting(true);
    try {
      await workspacesApi.addMember(workspace.id, { user_id: userId, role });
      toast.success('Membre ajouté');
      setSelectedUserId('');
      setManualUserId('');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ajout impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!workspace) return;
    try {
      await workspacesApi.removeMember(workspace.id, userId);
      toast.success('Membre retiré');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Suppression impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Membres — {workspace?.name}</DialogTitle>
          <DialogDescription>
            Gérez qui peut accéder aux pages et aux recherches IA de ce workspace.
          </DialogDescription>
        </DialogHeader>

        {/* Liste des membres */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun membre.</p>
          ) : (
            members.map((m) => {
              const isOwner = m.user_id === workspace?.owner_id;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary"
                >
                  <span className="flex-1 text-sm truncate">{usernameFor(m.user_id)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize flex items-center gap-1">
                    {isOwner && <Crown size={11} />}
                    {m.role}
                  </span>
                  {!isOwner && (
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
                      title="Retirer du workspace"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Ajout d'un membre */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Ajouter un membre
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            {allUsers ? (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choisir un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Tous les utilisateurs sont déjà membres
                    </div>
                  ) : (
                    candidates.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username} ({u.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
                placeholder="ID de l'utilisateur"
                className="flex-1"
              />
            )}

            <Select value={role} onValueChange={(v) => setRole(v as WorkspaceRole)}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membre</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
            </Button>
          </div>
          {!allUsers && (
            <p className="text-xs text-muted-foreground">
              Astuce : la sélection par nom nécessite un compte admin. Sinon, saisissez l'ID
              utilisateur.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
