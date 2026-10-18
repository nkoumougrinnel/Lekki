import React, { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  X, Building2, Plus, UserRoundPlus, GraduationCap, Cpu, Folder,
  ArrowRight, LoaderCircle, KeyRound,
} from "lucide-react";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const workspaceTypes = [
  { value: "GraduationCap", label: "Académique", description: "Cours, TD et ressources de formation", icon: GraduationCap },
  { value: "Building2", label: "Organisation", description: "Département, association ou administration", icon: Building2 },
  { value: "Cpu", label: "Équipe technique", description: "Produit, développement ou recherche", icon: Cpu },
  { value: "Folder", label: "Projet", description: "Un espace de travail polyvalent", icon: Folder },
] as const;

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const { createWorkspace, joinWorkspace } = useWorkspace();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [icon, setIcon] = useState("Folder");
  const [creating, setCreating] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (mode === "create") nameInputRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating) onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, mode, creating, onOpenChange]);

  useEffect(() => {
    if (open) return;
    setMode("create");
    setName("");
    setDescription("");
    setCode("");
    setIcon("Folder");
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;

    if (mode === "join" && !code.trim()) {
      toast.error("Saisissez le code d’invitation.");
      return;
    }
    if (mode === "create" && !name.trim()) {
      toast.error("Donnez un nom à votre espace.");
      return;
    }

    setCreating(true);
    try {
      if (mode === "join") {
        const joined = await joinWorkspace(code.trim());
        toast.success(`Vous avez rejoint « ${joined.name} »`);
      } else {
        const workspaceName = name.trim();
        await createWorkspace({
          name: workspaceName,
          description: description.trim() || undefined,
          icon,
        });
        toast.success(`Espace « ${workspaceName} » créé.`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : mode === "join"
            ? "Impossible de rejoindre cet espace."
            : "La création de l’espace a échoué."
      );
    } finally {
      setCreating(false);
    }
  };

  const changeMode = (nextMode: "create" | "join") => {
    if (!creating) setMode(nextMode);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !creating) onOpenChange(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-dialog-title"
        className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#14171D] shadow-[0_24px_100px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-150"
      >
        <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-300/10">
              <Building2 className="h-[19px] w-[19px]" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 id="workspace-dialog-title" className="text-[15px] font-semibold tracking-tight text-zinc-100">
                {mode === "create" ? "Créer un espace" : "Rejoindre un espace"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {mode === "create"
                  ? "Rassemblez vos documents et votre équipe au même endroit."
                  : "Utilisez le code partagé par un membre de l’espace."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            aria-label="Fermer"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 sm:px-6">
          <div className="grid grid-cols-2 rounded-xl bg-black/25 p-1 ring-1 ring-inset ring-white/[0.05]">
            <button
              type="button"
              onClick={() => changeMode("create")}
              aria-pressed={mode === "create"}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                mode === "create"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm ring-1 ring-inset ring-white/[0.07]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Plus className="h-3.5 w-3.5" /> Créer
            </button>
            <button
              type="button"
              onClick={() => changeMode("join")}
              aria-pressed={mode === "join"}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                mode === "join"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm ring-1 ring-inset ring-white/[0.07]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <UserRoundPlus className="h-3.5 w-3.5" /> Rejoindre
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            {mode === "create" ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="workspace-name" className="block text-xs font-medium text-zinc-200">
                    Nom de l’espace <span className="text-emerald-300">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    id="workspace-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex. SUP’PTIC · Télécoms & Réseaux"
                    maxLength={80}
                    autoComplete="off"
                    required
                    className="w-full rounded-xl border border-white/[0.09] bg-[#0D1015] px-3.5 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                  />
                  <div className="flex justify-end">
                    <span className="text-[10px] tabular-nums text-zinc-600">{name.length}/80</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="workspace-description" className="block text-xs font-medium text-zinc-200">
                    Description <span className="font-normal text-zinc-500">(facultatif)</span>
                  </label>
                  <textarea
                    id="workspace-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="À quoi servira cet espace ?"
                    rows={2}
                    maxLength={240}
                    className="w-full resize-none rounded-xl border border-white/[0.09] bg-[#0D1015] px-3.5 py-3 text-sm leading-relaxed text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                  />
                </div>

                <fieldset className="space-y-2.5">
                  <legend className="text-xs font-medium text-zinc-200">Quel type d’espace ?</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {workspaceTypes.map((type) => {
                      const Icon = type.icon;
                      const selected = icon === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setIcon(type.value)}
                          aria-pressed={selected}
                          className={`flex min-h-[76px] items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-emerald-400/40 bg-emerald-400/[0.07] ring-1 ring-inset ring-emerald-400/10"
                              : "border-white/[0.07] bg-white/[0.015] hover:border-white/[0.14] hover:bg-white/[0.035]"
                          }`}
                        >
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-emerald-300" : "text-zinc-500"}`} />
                          <span className="min-w-0">
                            <span className={`block text-xs font-medium ${selected ? "text-zinc-100" : "text-zinc-300"}`}>
                              {type.label}
                            </span>
                            <span className="mt-1 block text-[10px] leading-relaxed text-zinc-500">
                              {type.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            ) : (
              <div className="space-y-2">
                <label htmlFor="workspace-code" className="block text-xs font-medium text-zinc-200">
                  Code d’invitation
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="workspace-code"
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s/g, ""))}
                    placeholder="Ex. 7K2M9ABC"
                    maxLength={32}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    required
                    className="w-full rounded-xl border border-white/[0.09] bg-[#0D1015] py-3 pl-10 pr-3.5 text-sm tracking-[0.16em] text-zinc-100 outline-none transition placeholder:tracking-normal placeholder:text-zinc-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Vous pouvez demander ce code à un administrateur de l’espace.
                </p>
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-black/15 px-5 py-4 sm:px-6">
            <p className="hidden text-[10px] text-zinc-600 sm:block">
              {mode === "create" ? "Vous pourrez inviter des membres ensuite." : "Le code donne accès à un espace existant."}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={creating}
                className="rounded-lg px-3.5 py-2.5 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-zinc-200 disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={creating || (mode === "join" ? !code.trim() : !name.trim())}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:ring-offset-2 focus:ring-offset-[#14171D] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {creating ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : mode === "create" ? (
                  <Plus className="h-3.5 w-3.5" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                {creating
                  ? mode === "join" ? "Connexion…" : "Création…"
                  : mode === "join" ? "Rejoindre l’espace" : "Créer l’espace"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
