import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi } from "@/lib/api";
import { User } from "@/types/lekki";
import { toast } from "sonner";
import { X, Settings, Users, Trash2, UserPlus, Shield } from "lucide-react";

interface WorkspaceAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceAdminDialog({ open, onOpenChange }: WorkspaceAdminDialogProps) {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, refresh } = useWorkspace();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(activeWorkspaceId);
  const [members, setMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("member");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedId(activeWorkspaceId);
      usersApi.list().then((u) => setAllUsers(Array.isArray(u) ? u : [])).catch(() => {});
    }
  }, [open, activeWorkspaceId]);

  useEffect(() => {
    if (!open || !selectedId) return;
    setLoading(true);
    import("@/lib/api").then(({ workspaces }) => {
      workspaces.getMembers(selectedId).then((m) => setMembers(m)).catch(() => setMembers([])).finally(() => setLoading(false));
    });
  }, [open, selectedId]);

  if (!open) return null;
  const isAdmin = user?.role === "admin";

  const handleAdd = async () => {
    if (!selectedId || !addUserId) return;
    try {
      const { workspaces } = await import("@/lib/api");
      await workspaces.addMember(selectedId, addUserId, addRole);
      toast.success("Membre ajouté");
      const m = await workspaces.getMembers(selectedId);
      setMembers(m);
      setAddUserId("");
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleRemove = async (userId: string) => {
    if (!selectedId) return;
    try {
      const { workspaces } = await import("@/lib/api");
      await workspaces.removeMember(selectedId, userId);
      toast.success("Membre retiré");
      const m = await workspaces.getMembers(selectedId);
      setMembers(m);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}>
      <div className="w-full max-w-2xl bg-[#161A22] border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Gestion des workspaces (admin)</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {!isAdmin && <div className="text-xs text-amber-400">Accès restreint aux administrateurs.</div>}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Workspace</label>
            <select value={selectedId || ""} onChange={(e) => { setSelectedId(e.target.value); setActiveWorkspace(e.target.value); }} className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200">
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><Users className="h-3.5 w-3.5" /> Membres</div>
            {loading ? <div className="text-xs text-zinc-500">Chargement...</div> : (
              <div className="space-y-1">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-zinc-900/60 text-xs">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-zinc-500" />
                      <span className="text-zinc-200">{m.name}</span>
                      <span className="text-zinc-500">({m.email})</span>
                      <span className="text-emerald-400/80">{m.role}</span>
                    </div>
                    <button onClick={() => handleRemove(m.user_id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {members.length === 0 && <div className="text-xs text-zinc-500">Aucun membre.</div>}
              </div>
            )}
          </div>

          <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200"><UserPlus className="h-3.5 w-3.5" /> Ajouter un membre</div>
            <div className="flex gap-2">
              <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200">
                <option value="">Choisir un utilisateur</option>
                {allUsers.filter((u) => !members.some((m: any) => m.user_id === u.id)).map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                ))}
              </select>
              <select value={addRole} onChange={(e) => setAddRole(e.target.value)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200">
                <option value="member">Membre</option>
                <option value="admin">Admin</option>
                <option value="verifier">Vérificateur</option>
              </select>
              <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950">Ajouter</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
