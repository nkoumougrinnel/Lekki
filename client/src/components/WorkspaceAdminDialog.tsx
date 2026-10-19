import React, { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { workspaces as workspacesApi } from "@/lib/api";
import { WorkspaceMember } from "@/types/lekki";
import { toast } from "sonner";
import {
  X,
  Settings2,
  Users,
  Trash2,
  ShieldCheck,
  Copy,
  RefreshCw,
  Crown,
  LoaderCircle,
  Check,
  AlertTriangle,
  KeyRound,
  Building2,
} from "lucide-react";

interface WorkspaceAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleLabels: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  verifier: "Vérificateur",
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

export function WorkspaceAdminDialog({
  open,
  onOpenChange,
}: WorkspaceAdminDialogProps) {
  const { workspaces, activeWorkspaceId, refresh } = useWorkspace();

  const manageableWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.role === "admin" || workspace.role === "owner"),
    [workspaces],
  );

  const selectedId = activeWorkspaceId;
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("member");
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedWorkspace = manageableWorkspaces.find((workspace) => workspace.id === selectedId);
  const isOwner = selectedWorkspace?.role === "owner";
  const isAdmin = isOwner || selectedWorkspace?.role === "admin";

  useEffect(() => {
    if (!open || !selectedId) {
      setMembers([]);
      setJoinCode("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMembers([]);
    setJoinCode("");

    Promise.all([
      workspacesApi.getMembers(selectedId),
      workspacesApi.getJoinCode(selectedId),
    ])
      .then(([loadedMembers, code]) => {
        if (cancelled) return;
        setMembers(Array.isArray(loadedMembers) ? loadedMembers : []);
        setJoinCode(code.code || "");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMembers([]);
        setJoinCode("");
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de charger les paramètres de cet espace.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !codeLoading &&
        editingRoleId === null &&
        !removingUserId &&
        !deleting
      ) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, codeLoading, editingRoleId, removingUserId, deleting, onOpenChange]);

  if (!open) return null;

  const closeIfIdle = () => {
    if (!codeLoading && editingRoleId === null && !removingUserId && !deleting) {
      onOpenChange(false);
    }
  };

  const handleRotateCode = async () => {
    if (!selectedId || codeLoading || loading) return;
    const confirmed = window.confirm(
      "Renouveler ce code ? L’ancien code ne permettra plus de rejoindre cet espace.",
    );
    if (!confirmed) return;

    setCodeLoading(true);
    try {
      const result = await workspacesApi.rotateJoinCode(selectedId);
      setJoinCode(result.code);
      setCopied(false);
      toast.success("Un nouveau code d’invitation a été généré.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de renouveler le code.");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      toast.success("Code d’invitation copié.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Impossible de copier le code.");
    }
  };

  const handleChangeRole = async (member: WorkspaceMember) => {
    if (!selectedId) return;
    setEditingRoleId(member.user_id);
    setNewRole(member.role);
  };

  const handleConfirmRole = async (member: WorkspaceMember) => {
    if (!selectedId || editingRoleId === null) return;
    const role = newRole.trim();
    if (!role) return;

    setEditingRoleId(null);
    try {
      await workspacesApi.updateMemberRole(selectedId, member.user_id, role);
      toast.success(`Rôle de ${member.name} mis à jour : ${roleLabels[role] || role}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le rôle.");
    }
  };

  const handleCancelRole = () => {
    setEditingRoleId(null);
    setNewRole("");
  };

  const handleRemove = async (userId: string, memberName: string) => {
    if (!selectedId || removingUserId) return;
    const confirmed = window.confirm(`Retirer ${memberName} de cet espace ?`);
    if (!confirmed) return;

    setRemovingUserId(userId);
    try {
      await workspacesApi.removeMember(selectedId, userId);
      toast.success(`${memberName} a été retiré de l’espace.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de retirer ce membre.");
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspace || !isOwner || deleting) return;
    const confirmed = window.confirm(
      `Supprimer définitivement « ${selectedWorkspace.name} » et ses contenus ? Cette action est irréversible.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await workspacesApi.delete(selectedWorkspace.id);
      await refresh();
      toast.success(`L’espace « ${selectedWorkspace.name} » a été supprimé.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer cet espace.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeIfIdle();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-admin-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#14171D] shadow-[0_24px_100px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-150"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-300/10">
              <Settings2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="workspace-admin-title" className="text-[15px] font-semibold tracking-tight text-zinc-100">
                Espace « {selectedWorkspace?.name || "Inconnu"} »
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-400">
                Gestion des membres et des invitations de cet espace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeIfIdle}
            aria-label="Fermer"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {manageableWorkspaces.length === 0 ? (
          <div className="p-6">
            <div className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Aucun espace à administrer</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Vous devez être administrateur ou propriétaire d’un espace pour gérer ses membres et ses invitations.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-zinc-100">Code d’invitation</h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Toute personne possédant ce code peut demander à rejoindre cet espace.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRotateCode}
                  disabled={!joinCode || loading || codeLoading}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.09] px-2.5 py-2 text-[11px] font-medium text-zinc-300 transition hover:bg-white/[0.05] hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${codeLoading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Renouveler</span>
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0D1015] p-2">
                <code className="min-w-0 flex-1 truncate px-2 py-1 text-center font-mono text-lg tracking-[0.18em] text-emerald-200 sm:text-xl">
                  {loading ? "Chargement…" : joinCode || "Indisponible"}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  disabled={!joinCode || loading}
                  aria-label="Copier le code d’invitation"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-300 transition hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-600">
                <AlertTriangle className="h-3 w-3" />
                Renouveler le code invalide l’ancien.
              </p>
            </section>

            <section className="overflow-hidden rounded-xl border border-white/[0.07]">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-sm font-medium text-zinc-100">Membres</h3>
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400">
                    {loading ? "…" : members.length}
                  </span>
                </div>
                {loading && <LoaderCircle className="h-4 w-4 animate-spin text-zinc-500" />}
              </div>

              {loading ? (
                <div className="space-y-3 p-4 sm:p-5">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex animate-pulse items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-white/[0.06]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-2.5 w-1/3 rounded bg-white/[0.06]" />
                        <div className="h-2 w-1/2 rounded bg-white/[0.04]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Users className="mx-auto h-6 w-6 text-zinc-600" />
                  <p className="mt-2 text-xs font-medium text-zinc-300">Aucun membre pour le moment</p>
                  <p className="mt-1 text-[11px] text-zinc-500">Partagez le code d’invitation pour accueillir des membres.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {members.map((member) => {
                    const isEditing = editingRoleId === member.user_id;
                    const isMemberOwner = member.role === "owner";
                    const canEditRole = isAdmin && !isMemberOwner;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.02] sm:px-5"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-zinc-300">
                          {getInitials(member.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-zinc-200">{member.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-zinc-500">{member.email}</p>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={newRole}
                              onChange={(event) => setNewRole(event.target.value)}
                              disabled={loading}
                              className="rounded-lg border border-white/[0.08] bg-[#0D1015] px-2 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-400/50 disabled:opacity-50"
                            >
                              {Object.entries(roleLabels).map(([role, label]) => (
                                <option key={role} value={role}>{label}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleConfirmRole(member)}
                              disabled={loading}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950 hover:bg-emerald-300 transition disabled:opacity-50"
                              title="Confirmer le rôle"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelRole}
                              disabled={loading}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200 transition disabled:opacity-50"
                              title="Annuler"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className={`hidden shrink-0 rounded-md px-2 py-1 text-[10px] sm:inline-flex ${
                                member.role === "owner"
                                  ? "bg-amber-300/10 text-amber-200"
                                  : member.role === "admin"
                                    ? "bg-emerald-300/10 text-emerald-200"
                                    : "bg-white/[0.05] text-zinc-400"
                              }`}
                            >
                              {roleLabels[member.role] || member.role}
                            </span>
                            {canEditRole && (
                              <button
                                type="button"
                                onClick={() => handleChangeRole(member)}
                                disabled={loading}
                                title="Modifier le rôle"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-300 hover:text-emerald-400 hover:bg-emerald-400/10 transition disabled:opacity-50"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemove(member.user_id, member.name)}
                              disabled={Boolean(removingUserId) || member.role === "owner" || deleting || loading}
                              aria-label={`Retirer ${member.name}`}
                              title={member.role === "owner" ? "Le propriétaire ne peut pas être retiré ici" : "Retirer ce membre"}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-25"
                            >
                              {removingUserId === member.user_id
                                ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {isOwner && (
              <section className="flex flex-col gap-4 rounded-xl border border-red-400/15 bg-red-400/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-400/10 text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-200">Supprimer cet espace</h3>
                    <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
                      Le Drive partagé, le Wiki et les membres associés seront supprimés. Cette action est irréversible.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteWorkspace}
                  disabled={deleting || loading || codeLoading}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-200 transition hover:border-red-400/35 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {deleting ? "Suppression…" : "Supprimer l’espace"}
                </button>
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
