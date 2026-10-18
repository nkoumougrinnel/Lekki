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
  UserPlus,
  ShieldCheck,
  Copy,
  RefreshCw,
  Building2,
  Crown,
  LoaderCircle,
  Check,
  AlertTriangle,
  KeyRound,
  Fingerprint,
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

  const [selectedId, setSelectedId] = useState<string | null>(activeWorkspaceId);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedWorkspace = manageableWorkspaces.find((workspace) => workspace.id === selectedId);
  const isOwner = selectedWorkspace?.role === "owner";

  useEffect(() => {
    if (!open) return;

    const activeIsManageable = manageableWorkspaces.some(
      (workspace) => workspace.id === activeWorkspaceId,
    );
    const nextId = activeIsManageable
      ? activeWorkspaceId
      : manageableWorkspaces[0]?.id ?? null;

    setSelectedId(nextId);
    setAddUserId("");
  }, [open, activeWorkspaceId, manageableWorkspaces]);

  useEffect(() => {
    if (!open || !selectedId || !manageableWorkspaces.some((workspace) => workspace.id === selectedId)) {
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
  }, [open, selectedId, manageableWorkspaces]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !adding && !deleting && !removingUserId && !codeLoading) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, adding, deleting, removingUserId, codeLoading, onOpenChange]);

  if (!open) return null;

  const reloadMembers = async (workspaceId: string) => {
    const loaded = await workspacesApi.getMembers(workspaceId);
    setMembers(Array.isArray(loaded) ? loaded : []);
  };

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId || !addUserId || adding) return;

    setAdding(true);
    try {
      await workspacesApi.addMember(selectedId, addUserId, addRole);
      await reloadMembers(selectedId);
      setAddUserId("");
      toast.success("Le membre a été ajouté à l’espace.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’ajouter ce membre.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string, memberName: string) => {
    if (!selectedId || removingUserId) return;
    const confirmed = window.confirm(`Retirer ${memberName} de cet espace ?`);
    if (!confirmed) return;

    setRemovingUserId(userId);
    try {
      await workspacesApi.removeMember(selectedId, userId);
      await reloadMembers(selectedId);
      toast.success(`${memberName} a été retiré de l’espace.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de retirer ce membre.");
    } finally {
      setRemovingUserId(null);
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

  const closeIfIdle = () => {
    if (!adding && !deleting && !removingUserId && !codeLoading) onOpenChange(false);
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
                Gestion des espaces
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-400">
                Gérez les membres, les accès et les invitations de vos espaces.
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
          <>
            <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
              <label htmlFor="managed-workspace" className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Espace sélectionné
              </label>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <select
                  id="managed-workspace"
                  value={selectedId || ""}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setAddUserId("");
                  }}
                  className="min-w-0 flex-1 appearance-none rounded-lg border border-white/[0.08] bg-[#0D1015] px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                >
                  {manageableWorkspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                  ))}
                </select>
                <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/[0.07] px-2.5 py-1 text-[10px] text-zinc-400 sm:inline-flex">
                  {isOwner ? <Crown className="h-3 w-3 text-amber-300" /> : <ShieldCheck className="h-3 w-3 text-emerald-300" />}
                  {isOwner ? "Propriétaire" : "Admin"}
                </span>
              </div>
            </div>

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
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.02] sm:px-5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-zinc-300">
                          {getInitials(member.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-zinc-200">{member.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-zinc-500">{member.email}</p>
                        </div>
                        <span className={`hidden shrink-0 rounded-md px-2 py-1 text-[10px] sm:inline-flex ${
                          member.role === "owner"
                            ? "bg-amber-300/10 text-amber-200"
                            : member.role === "admin"
                              ? "bg-emerald-300/10 text-emerald-200"
                              : "bg-white/[0.05] text-zinc-400"
                        }`}>
                          {roleLabels[member.role] || member.role}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(member.user_id, member.name)}
                          disabled={Boolean(removingUserId) || member.role === "owner" || deleting}
                          aria-label={`Retirer ${member.name}`}
                          title={member.role === "owner" ? "Le propriétaire ne peut pas être retiré ici" : "Retirer ce membre"}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-25"
                        >
                          {removingUserId === member.user_id
                            ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-zinc-100">Ajouter un membre</h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Saisissez l’identifiant Lekki exact et choisissez son rôle dans cet espace.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAdd} className="mt-4 space-y-3">
                  <label htmlFor="workspace-member-id" className="block text-[11px] font-medium text-zinc-400">
                    Identifiant utilisateur
                  </label>
                  <div className="relative">
                    <Fingerprint className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      id="workspace-member-id"
                      type="text"
                      value={addUserId}
                      onChange={(event) => setAddUserId(event.target.value.trim())}
                      placeholder="Collez l’identifiant exact"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={adding}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#0D1015] py-2.5 pl-10 pr-3 text-xs text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/50 disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                    <select
                      value={addRole}
                      onChange={(event) => setAddRole(event.target.value)}
                      disabled={adding}
                      aria-label="Rôle du nouveau membre"
                      className="rounded-lg border border-white/[0.08] bg-[#0D1015] px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-400/50 disabled:opacity-50"
                    >
                      <option value="member">Membre</option>
                      <option value="admin">Administrateur</option>
                      <option value="verifier">Vérificateur</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={!selectedId || !addUserId || adding}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3.5 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {adding ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                      {adding ? "Ajout en cours…" : "Ajouter au workspace"}
                    </button>
                  </div>
                </form>
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
                    disabled={deleting || adding || Boolean(removingUserId) || codeLoading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-200 transition hover:border-red-400/35 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deleting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    {deleting ? "Suppression…" : "Supprimer l’espace"}
                  </button>
                </section>
              )}
            </div>

          </>
        )}
      </section>
    </div>
  );
}
