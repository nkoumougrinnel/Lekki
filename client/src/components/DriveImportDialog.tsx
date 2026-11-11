import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Folder,
  FileText,
  GraduationCap,
  HardDrive,
  LoaderCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Workspace } from "@/types/lekki";
import {
  ApiError,
  googleDriveApi,
  type GoogleDriveConfig,
  type GoogleDriveImportJob,
  type GoogleDriveItem,
} from "@/lib/api";
import { pickDriveFiles } from "@/lib/googlePicker";

interface DriveImportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Espace de destination ; `null` = « Mes documents ». */
  workspace: Workspace | null;
  /** Dossier Lekki de destination (dossier ouvert au moment du clic). */
  folderId: string | null;
  folderName?: string | null;
  onImported: () => void | Promise<void>;
}

type Step = "source" | "supdocs" | "progress";

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Une erreur est survenue.";
}

/**
 * Importer depuis Google Drive : les annales SUP'DOCS (espaces de promo, arborescence conservée)
 * ou des fichiers choisis dans son propre Drive.
 */
export function DriveImportDialog({ open, onClose, workspace, folderId, folderName, onImported }: DriveImportDialogProps) {
  const [config, setConfig] = useState<GoogleDriveConfig | null>(null);
  const [step, setStep] = useState<Step>("source");
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<GoogleDriveItem[]>([]);
  const [selected, setSelected] = useState<Map<string, GoogleDriveItem>>(new Map());
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<GoogleDriveImportJob | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const autoOpened = useRef(false);
  const crumbs = useRef<HTMLElement>(null);

  // Le chemin peut être long (« ITT · Ingénieurs des Travaux… ») : on garde la fin visible.
  useEffect(() => {
    if (crumbs.current) crumbs.current.scrollLeft = crumbs.current.scrollWidth;
  }, [path]);

  const isPromo = Boolean(workspace?.academic);
  const supdocsAvailable = Boolean(config?.supdocs && isPromo);
  const pickerAvailable = Boolean(config?.picker);
  const destination = folderName || (workspace ? workspace.name : "Mes documents");
  const working = job !== null && (job.state === "preparing" || job.state === "importing");

  useEffect(() => {
    if (!open) return;
    setStep("source");
    setSelected(new Map());
    setJob(null);
    setShowSkipped(false);
    autoOpened.current = false;
    googleDriveApi
      .config()
      .then(setConfig)
      .catch(() => setConfig({ supdocs: false, picker: false, client_id: null, api_key: null, app_id: null }));
  }, [open]);

  const browse = useCallback(async (target?: string | null) => {
    setLoading(true);
    try {
      const result = await googleDriveApi.browseSupdocs(target);
      setPath(result.path);
      setItems(result.items);
      return result;
    } catch (error) {
      toast.error(message(error));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Ouvre directement le dossier de l'année de la promo (« ITT2 »), s'il existe.
  const openSupdocs = useCallback(async () => {
    setStep("supdocs");
    const root = await browse(null);
    if (!root || autoOpened.current || !workspace?.academic) return;
    autoOpened.current = true;
    const cycle = root.items.find((item) => item.kind === "folder" && /^ITT\b/i.test(item.name));
    if (!cycle) return;
    const inCycle = await browse(cycle.id);
    const year = inCycle?.items.find(
      (item) => item.kind === "folder" && item.name.replace(/\s+/g, "").toUpperCase() === `ITT${workspace.academic!.level}`
    );
    if (year) await browse(year.id);
  }, [browse, workspace]);

  const follow = useCallback(async (id: string) => {
    let finished = false;
    while (!finished) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      try {
        const current = await googleDriveApi.job(id);
        setJob(current);
        finished = current.state === "done" || current.state === "failed";
      } catch (error) {
        setJob((previous) => previous && { ...previous, state: "failed", error: message(error) });
        finished = true;
      }
    }
  }, []);

  const start = useCallback(
    async (body: Parameters<typeof googleDriveApi.startImport>[0]) => {
      setStep("progress");
      try {
        const created = await googleDriveApi.startImport(body);
        setJob(created);
        if (created.state !== "done" && created.state !== "failed") await follow(created.id);
      } catch (error) {
        setJob({
          id: "",
          state: "failed",
          total: 0,
          processed: 0,
          imported: 0,
          folders_created: 0,
          current: null,
          skipped: [],
          skipped_count: 0,
          error: message(error),
        });
      }
    },
    [follow]
  );

  const importSupdocs = () =>
    start({ source: "supdocs", item_ids: Array.from(selected.keys()), workspace_id: workspace?.id ?? null, folder_id: folderId });

  const importFromMyDrive = async () => {
    if (!config) return;
    try {
      const picked = await pickDriveFiles(config);
      if (!picked || picked.fileIds.length === 0) return;
      await start({
        source: "google",
        item_ids: picked.fileIds,
        access_token: picked.accessToken,
        workspace_id: workspace?.id ?? null,
        folder_id: folderId,
      });
    } catch (error) {
      toast.error(message(error));
    }
  };

  const finish = async () => {
    if (job?.imported) await onImported();
    onClose();
  };

  if (!open) return null;

  const toggle = (item: GoogleDriveItem) =>
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });

  const selectable = items.filter((item) => item.importable);
  const allSelected = selectable.length > 0 && selectable.every((item) => selected.has(item.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="drive-import-title"
        className={`flex w-full flex-col ${step === "supdocs" ? "h-[92dvh]" : "max-h-[92dvh]"} overflow-hidden rounded-t-2xl bg-[#14171D] sm:h-auto sm:max-h-[85vh] sm:max-w-xl sm:rounded-2xl sm:border sm:border-white/[0.09]`}
      >
        <header className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-3 sm:px-5 sm:py-4">
          {step === "supdocs" && (
            <button
              type="button"
              onClick={() => (path.length > 1 ? void browse(path[path.length - 2].id) : setStep("source"))}
              aria-label="Retour"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1 px-1">
            <h2 id="drive-import-title" className="text-[15px] font-semibold text-zinc-100">
              Importer depuis Google Drive
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-400">Vers « {destination} »</p>
          </div>
          <button
            type="button"
            onClick={() => (working ? onClose() : void finish())}
            aria-label="Fermer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* 1. Choix de la source */}
        {step === "source" && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5">
            {!config ? (
              <div className="flex justify-center py-10 text-zinc-500">
                <LoaderCircle className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                {isPromo && (
                  <SourceCard
                    icon={GraduationCap}
                    title="SUP'DOCS · les annales de l'école"
                    text="Cours, TD et anciens sujets rangés par semestre et par matière. L'arborescence est recopiée telle quelle."
                    disabled={!supdocsAvailable}
                    disabledText="Pas encore activé sur ce serveur."
                    onClick={() => void openSupdocs()}
                  />
                )}
                <SourceCard
                  icon={HardDrive}
                  title="Mon Google Drive"
                  text="Choisis des fichiers dans ton Drive. Lekki n'a accès qu'aux fichiers que tu sélectionnes."
                  disabled={!pickerAvailable}
                  disabledText="Pas encore activé sur ce serveur."
                  onClick={() => void importFromMyDrive()}
                />
                {!isPromo && (
                  <p className="px-1 text-xs leading-5 text-zinc-500">
                    SUP'DOCS s'importe dans un espace de promo (un espace avec un programme d'études).
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* 2. Parcourir SUP'DOCS */}
        {step === "supdocs" && (
          <>
            <nav ref={crumbs} aria-label="Chemin" className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-4 py-2 text-xs [scrollbar-width:none] sm:px-5">
              {path.map((crumb, index) => (
                <React.Fragment key={crumb.id}>
                  {index > 0 && <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-zinc-600" />}
                  <button
                    type="button"
                    onClick={() => void browse(crumb.id)}
                    disabled={index === path.length - 1}
                    className="shrink-0 rounded px-1.5 py-1 text-zinc-400 hover:text-zinc-100 disabled:font-medium disabled:text-zinc-100"
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </nav>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12 text-zinc-500">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-zinc-500">Ce dossier est vide.</p>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {selectable.length > 1 && (
                    <li>
                      <button
                        type="button"
                        onClick={() =>
                          setSelected((current) => {
                            const next = new Map(current);
                            selectable.forEach((item) => (allSelected ? next.delete(item.id) : next.set(item.id, item)));
                            return next;
                          })
                        }
                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-emerald-400 sm:px-5"
                      >
                        {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                      </button>
                    </li>
                  )}
                  {items.map((item) => {
                    const checked = selected.has(item.id);
                    const Icon = item.kind === "folder" ? Folder : FileText;
                    return (
                      <li key={item.id} className="flex items-center">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={`Sélectionner ${item.name}`}
                          disabled={!item.importable}
                          onClick={() => toggle(item)}
                          className="flex h-14 w-14 shrink-0 items-center justify-center disabled:opacity-30"
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded border ${
                              checked ? "border-emerald-400 bg-emerald-400 text-zinc-950" : "border-zinc-600"
                            }`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => (item.kind === "folder" ? void browse(item.id) : item.importable && toggle(item))}
                          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 pr-4 text-left sm:pr-5"
                        >
                          <Icon className={`h-5 w-5 shrink-0 ${item.kind === "folder" ? "text-amber-300/80" : "text-zinc-500"}`} />
                          <span className={`min-w-0 flex-1 truncate text-sm ${item.importable ? "text-zinc-200" : "text-zinc-600"}`}>
                            {item.name}
                          </span>
                          {item.kind === "folder" && <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />}
                          {!item.importable && <span className="shrink-0 text-[11px] text-zinc-600">format non lu</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <footer className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
              <p className="min-w-0 flex-1 text-xs text-zinc-400">
                {selected.size === 0
                  ? "Coche des dossiers ou des fichiers."
                  : `${selected.size} élément${selected.size > 1 ? "s" : ""} : sous-dossiers compris.`}
              </p>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => void importSupdocs()}
                className="h-11 shrink-0 rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 disabled:opacity-40"
              >
                Importer
              </button>
            </footer>
          </>
        )}

        {/* 3. Avancement */}
        {step === "progress" && (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
            {!job || job.state === "preparing" ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <LoaderCircle className="h-6 w-6 animate-spin text-emerald-400" />
                <p className="text-sm text-zinc-300">Lecture des dossiers sur Google Drive…</p>
              </div>
            ) : job.state === "importing" ? (
              <div className="space-y-4 py-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-zinc-100">Import en cours</span>
                  <span className="tabular-nums text-zinc-400">
                    {job.processed} / {job.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
                    style={{ width: `${job.total ? Math.round((job.processed / job.total) * 100) : 0}%` }}
                  />
                </div>
                {job.current && <p className="truncate text-xs text-zinc-500">{job.current}</p>}
                <p className="text-xs leading-5 text-zinc-500">
                  Tu peux fermer cette fenêtre : l'import continue et les documents apparaîtront dans « {destination} ».
                </p>
              </div>
            ) : job.state === "failed" ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertTriangle className="h-7 w-7 text-amber-400" />
                <p className="text-sm text-zinc-200">{job.error || "L'import n'a pas pu aboutir."}</p>
                {job.imported > 0 && <p className="text-xs text-zinc-500">{job.imported} document(s) importé(s) avant l'arrêt.</p>}
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="text-[15px] font-semibold text-zinc-100">
                    {job.imported} document{job.imported > 1 ? "s" : ""} importé{job.imported > 1 ? "s" : ""}
                  </p>
                  {job.folders_created > 0 && (
                    <p className="text-xs text-zinc-400">
                      {job.folders_created} dossier{job.folders_created > 1 ? "s" : ""} créé{job.folders_created > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                {job.skipped_count > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <button
                      type="button"
                      onClick={() => setShowSkipped((value) => !value)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-xs text-zinc-300"
                    >
                      {job.skipped_count} fichier{job.skipped_count > 1 ? "s" : ""} non importé{job.skipped_count > 1 ? "s" : ""}
                      <ChevronRight className={`h-4 w-4 transition ${showSkipped ? "rotate-90" : ""}`} />
                    </button>
                    {showSkipped && (
                      <ul className="max-h-48 space-y-2 overflow-y-auto border-t border-white/[0.06] px-4 py-3">
                        {job.skipped.map((entry, index) => (
                          <li key={`${entry.name}-${index}`} className="text-xs">
                            <span className="text-zinc-300">{entry.name}</span>
                            <span className="block text-zinc-500">{entry.reason}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            {job && !working && (
              <button
                type="button"
                onClick={() => void finish()}
                className="mt-4 h-11 w-full rounded-xl bg-emerald-400 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
              >
                {job.imported ? "Voir les documents" : "Fermer"}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SourceCard({
  icon: Icon,
  title,
  text,
  disabled,
  disabledText,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
  disabled: boolean;
  disabledText: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.04] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/[0.08] disabled:hover:bg-white/[0.02]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-100">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-zinc-400">{disabled ? disabledText : text}</span>
      </span>
      {!disabled && <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-zinc-500" />}
    </button>
  );
}
