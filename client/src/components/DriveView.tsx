import React, { useEffect, useMemo, useRef, useState } from "react";
import type { DriveFile, DriveFolder, User, NavView } from "@/types/lekki";
import { fileUrl, drive } from "@/lib/api";
import { DocumentTypeIcon } from "./DocumentTypeIcon";
import { StudentDocBadge } from "./StudentDocBadge";
import { classifyFile } from "@/lib/studentDocs";
import { toast } from "sonner";
import {
  Folder,
  FolderPlus,
  Plus,
  Camera,
  FolderUp,
  FileText,
  Star,
  Share2,
  Trash2,
  Download,
  Upload,
  ChevronRight,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  LoaderCircle,
  FolderOpen,
  Eye,
  X,
  HardDrive,
} from "lucide-react";

interface DriveViewProps {
  currentView: NavView;
  files: DriveFile[];
  folders: DriveFolder[];
  loading?: boolean;
  activeWorkspaceId?: string | null;
  activeWorkspaceName?: string;
  currentUser: User | null;
  onOpenFile: (file: DriveFile) => void;
  onOpenShare: (file: DriveFile) => void;
  onNewFileClick: (folderId?: string) => void;
  onImportFolderClick?: (folderId?: string) => void;
  /** Import depuis Google Drive (SUP'DOCS ou Drive personnel). */
  onDriveImportClick?: (folderId?: string) => void;
  onRefresh: () => void;
  onFileTrashed: (file: DriveFile, permanentlyDeleted?: boolean) => void;
  onFileRestored: (file: DriveFile) => void;
  onAskAIAboutFile?: (file: DriveFile) => void;
  /** Photographier un sujet papier (téléphone). */
  onScanClick?: (folderId?: string) => void;
}

type SortKey = "name" | "modified" | "size";

const EMPTY_STATES: Record<string, { title: string; text: string }> = {
  default: { title: "Aucun document ici", text: "Ajoute un cours, un TD ou un ancien sujet pour le retrouver ici." },
  workspace_files: {
    title: "Aucun document ici",
    text: "Ajoute un cours, un TD ou un ancien sujet : il sera rangé sous sa matière et visible par tout l’espace.",
  },
  my_docs: { title: "Aucun document personnel", text: "Ce que tu ajoutes ici n’est visible que par toi." },
  starred: { title: "Aucun favori", text: "Ajoute un document aux favoris depuis son menu « ⋯ » pour le retrouver ici." },
  shared_with_me: { title: "Rien de partagé pour l’instant", text: "Les documents qu’un camarade partage directement avec toi apparaîtront ici." },
  trash: { title: "La corbeille est vide", text: "Les documents supprimés apparaîtront ici." },
};

const VIEW_TITLES: Partial<Record<NavView, string>> = {
  my_docs: "Mes documents",
  workspace_files: "Fichiers de l’espace",
  starred: "Favoris",
  shared_with_me: "Partagés avec moi",
  trash: "Corbeille",
};

const getExtension = (file: DriveFile) =>
  (file.extension || file.name.split(".").pop() || "").replace(/^\./, "").toLowerCase();

const formatFileSize = (bytes?: number) => {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`;
};

export function DriveView({
  currentView,
  files,
  folders,
  loading = false,
  activeWorkspaceId,
  activeWorkspaceName,
  onOpenFile,
  onOpenShare,
  onNewFileClick,
  onImportFolderClick,
  onDriveImportClick,
  onScanClick,
  onRefresh,
  onFileTrashed,
  onFileRestored,
  onAskAIAboutFile,
}: DriveViewProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAscending, setSortAscending] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const breadcrumbRef = useRef<HTMLElement>(null);

  const isTrashView = currentView === "trash";
  const isPersonalScope =
    currentView === "my_docs" ||
    currentView === "starred" ||
    currentView === "shared_with_me" ||
    currentView === "trash";
  const canCreateFolder = currentView === "my_docs" || currentView === "workspace_files";

  useEffect(() => {
    setCurrentFolderId(null);
    setShowNewFolderInput(false);
    setNewFolderName("");
    setOpenMenuId(null);
  }, [currentView, activeWorkspaceId]);

  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  useEffect(() => {
    const breadcrumb = breadcrumbRef.current;
    if (breadcrumb) {
      breadcrumb.scrollTo({ left: breadcrumb.scrollWidth, behavior: "smooth" });
    }
  }, [currentFolderId]);

  useEffect(() => {
    if (!showNewFolderInput) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creatingFolder) {
        setShowNewFolderInput(false);
        setNewFolderName("");
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showNewFolderInput, creatingFolder]);

  const folderScope = useMemo(() => {
    if (!canCreateFolder) return [];
    return folders.filter((folder) => {
      if (isPersonalScope) return !folder.workspace_id;
      return Boolean(folder.workspace_id) &&
        (!activeWorkspaceId || folder.workspace_id === activeWorkspaceId);
    });
  }, [folders, canCreateFolder, isPersonalScope, activeWorkspaceId]);

  const currentFolder = folderScope.find((folder) => folder.id === currentFolderId) ?? null;
  const currentFolderPath = useMemo(() => {
    if (!currentFolderId) return [] as DriveFolder[];

    const path: DriveFolder[] = [];
    let current: DriveFolder | null =
      folderScope.find((folder) => folder.id === currentFolderId) ?? null;

    while (current) {
      path.unshift(current);
      const parentId = current.parent_id;
      current = parentId
        ? folderScope.find((folder) => folder.id === parentId) ?? null
        : null;
    }

    return path;
  }, [folderScope, currentFolderId]);

  const visibleFolders = useMemo(
    () =>
      folderScope
        .filter((folder) =>
          currentFolderId ? folder.parent_id === currentFolderId : !folder.parent_id
        )
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [folderScope, currentFolderId]
  );

  const displayedFiles = useMemo(() => {
    return files
      .filter((file) => {
        if (currentFolderId) return file.folder_id === currentFolderId;
        if (currentView === "workspace_files" || currentView === "my_docs") {
          return !file.folder_id;
        }
        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortKey === "name") comparison = a.name.localeCompare(b.name, "fr");
        if (sortKey === "size") comparison = (a.size_bytes ?? 0) - (b.size_bytes ?? 0);
        if (sortKey === "modified") {
          const dateA = new Date((a as any).updated_at ?? (a as any).created_at ?? 0).getTime();
          const dateB = new Date((b as any).updated_at ?? (b as any).created_at ?? 0).getTime();
          comparison = dateA - dateB;
        }
        return sortAscending ? comparison : -comparison;
      });
  }, [files, currentFolderId, currentView, sortKey, sortAscending]);

  const title = VIEW_TITLES[currentView] ?? activeWorkspaceName ?? "Fichiers";
  const rootLabel =
    currentView === "workspace_files" ? activeWorkspaceName || title : title;
  const canManageFiles = !isTrashView;
  // On n’ajoute un fichier que là où il sera rangé : pas dans Favoris ni Partagés avec moi.
  const canAddFiles = currentView === "my_docs" || currentView === "workspace_files";
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const emptyState = EMPTY_STATES[currentView] ?? EMPTY_STATES.default;

  const handleToggleStar = async (file: DriveFile) => {
    setBusyFileId(file.id);
    try {
      await drive.updateFile(file.id, { is_starred: !file.is_starred });
      toast.success(file.is_starred ? "Retiré des favoris" : "Ajouté aux favoris");
      await onRefresh();
    } catch {
      toast.error("Impossible de mettre à jour les favoris");
    } finally {
      setBusyFileId(null);
      setOpenMenuId(null);
    }
  };

  const handleTrashOrDelete = async (file: DriveFile) => {
    const confirmed = window.confirm(
      isTrashView
        ? `Supprimer définitivement « ${file.name} » ? Cette action est irréversible.`
        : `Déplacer « ${file.name} » dans la corbeille ?`
    );
    if (!confirmed) return;
    setBusyFileId(file.id);
    try {
      await drive.deleteFile(file.id, isTrashView);
      onFileTrashed(file, isTrashView);
      toast.success(isTrashView ? "Document supprimé définitivement" : "Document déplacé dans la corbeille");
      await onRefresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setBusyFileId(null);
      setOpenMenuId(null);
    }
  };

  const handleRestore = async (file: DriveFile) => {
    setBusyFileId(file.id);
    try {
      await drive.updateFile(file.id, { is_deleted: false });
      onFileRestored(file);
      toast.success("Document restauré");
      await onRefresh();
    } catch {
      toast.error("Impossible de restaurer le document");
    } finally {
      setBusyFileId(null);
      setOpenMenuId(null);
    }
  };

  const handleDownload = (file: DriveFile) => {
    const link = document.createElement("a");
    link.href = fileUrl(`/drive/files/${file.id}/download`);
    link.setAttribute("download", file.name);
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setOpenMenuId(null);
  };

  const handleCreateFolder = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newFolderName.trim();
    if (!name || creatingFolder) return;
    setCreatingFolder(true);
    try {
      await drive.createFolder({
        name,
        workspace_id: isPersonalScope
          ? null
          : currentFolder?.workspace_id || activeWorkspaceId || null,
        parent_id: currentFolderId || null,
      });
      toast.success(`Dossier « ${name} » créé`);
      setNewFolderName("");
      setShowNewFolderInput(false);
      await onRefresh();
    } catch {
      toast.error("Impossible de créer le dossier");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folder: DriveFolder, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(`Supprimer le dossier « ${folder.name} » ?`)) return;
    try {
      await drive.deleteFolder(folder.id);
      if (currentFolderId === folder.id) setCurrentFolderId(folder.parent_id || null);
      toast.success("Dossier supprimé");
      await onRefresh();
    } catch {
      toast.error("Impossible de supprimer ce dossier. Vérifie qu’il est vide.");
    }
  };

  return (
    <div
      id="drive-view-container"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f8fafd] text-[#2C2D32] dark:bg-[#21252C] dark:text-zinc-100"
    >
      <header className="sticky top-0 z-20 border-b border-[#e4e7eb] bg-[#f8fafd]/95 px-4 py-3 backdrop-blur dark:border-white/[0.08] dark:bg-[#252931]/95 sm:px-7">
        <div className="flex items-center justify-between gap-3">
          <nav
            ref={breadcrumbRef}
            aria-label="Fil d’Ariane"
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm text-zinc-600 dark:text-zinc-300"
            style={{ scrollbarWidth: "none" }}
          >
            <FolderOpen className="mr-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            {currentFolderPath.length === 0 ? (
              <span className="max-w-full truncate px-1 font-semibold text-zinc-900 dark:text-white" aria-current="page">
                {rootLabel}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(null)}
                  title={rootLabel}
                  className="max-w-[34vw] shrink-0 truncate rounded-lg px-2 py-1.5 text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white sm:max-w-48"
                >
                  {rootLabel}
                </button>
                {currentFolderPath.map((folder, index) => (
                  <React.Fragment key={folder.id}>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400/80" />
                    {index === currentFolderPath.length - 1 ? (
                      <span
                        title={folder.name}
                        aria-current="page"
                        className="max-w-[42vw] shrink-0 truncate rounded-lg bg-emerald-500/10 px-2.5 py-1.5 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20 sm:max-w-64"
                      >
                        {folder.name}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentFolderId(folder.id)}
                        title={folder.name}
                        className="max-w-[24vw] shrink-0 truncate rounded-lg px-2 py-1.5 transition hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white sm:max-w-40"
                      >
                        {folder.name}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </>
            )}
          </nav>

          {canAddFiles && (
            <button
              type="button"
              onClick={() => setAddSheetOpen(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 shadow-sm active:bg-emerald-400 sm:hidden"
            >
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          )}
          <div className="hidden items-center gap-2 sm:flex">
            {canCreateFolder && (
              <button
                type="button"
                onClick={() => {
                  setNewFolderName("");
                  setShowNewFolderInput(true);
                }}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#dadce0] bg-white px-3 text-xs font-medium text-[#484D50] transition hover:bg-[#f1f3f4] dark:border-white/10 dark:bg-[#2D3139] dark:text-zinc-100 dark:hover:bg-[#383D47]"
              >
                <FolderPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Dossier</span>
              </button>
            )}
            {canAddFiles && onImportFolderClick && (
              <button
                type="button"
                onClick={() => onImportFolderClick(currentFolderId || undefined)}
                title="Importer un dossier entier, avec ses sous-dossiers"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#dadce0] bg-white px-3 text-xs font-medium text-[#484D50] transition hover:bg-[#f1f3f4] dark:border-white/10 dark:bg-[#2D3139] dark:text-zinc-100 dark:hover:bg-[#383D47]"
              >
                <FolderUp className="h-4 w-4" />
                <span className="hidden md:inline">Importer un dossier</span>
              </button>
            )}
            {canAddFiles && onDriveImportClick && (
              <button
                type="button"
                onClick={() => onDriveImportClick(currentFolderId || undefined)}
                title="Importer depuis Google Drive ou SUP'DOCS"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#dadce0] bg-white px-3 text-xs font-medium text-[#484D50] transition hover:bg-[#f1f3f4] dark:border-white/10 dark:bg-[#2D3139] dark:text-zinc-100 dark:hover:bg-[#383D47]"
              >
                <HardDrive className="h-4 w-4" />
                <span className="hidden md:inline">Google Drive</span>
              </button>
            )}
            {canAddFiles && (
              <button
                type="button"
                onClick={() => onNewFileClick(currentFolderId || undefined)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-emerald-500 px-3 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-emerald-400"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Fichier</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {addSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm sm:hidden" onClick={() => setAddSheetOpen(false)}>
          <div
            role="menu"
            aria-label="Ajouter"
            onClick={(event) => event.stopPropagation()}
            className="w-full rounded-t-2xl border-t border-white/[0.08] bg-[#262A33] px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15" />
            <p className="px-3 pb-2 text-xs text-zinc-500">
              Ajouter dans « {currentFolder ? currentFolder.name : rootLabel} »
            </p>
            {[
              onScanClick && { icon: Camera, label: "Photographier un sujet", hint: "Sujet papier : une photo par page", action: () => onScanClick(currentFolderId || undefined) },
              { icon: Upload, label: "Envoyer un fichier", hint: "PDF, Word, PowerPoint ou photo", action: () => onNewFileClick(currentFolderId || undefined) },
              canCreateFolder && { icon: FolderPlus, label: "Nouveau dossier", hint: "", action: () => { setNewFolderName(""); setShowNewFolderInput(true); } },
              onImportFolderClick && { icon: FolderUp, label: "Importer un dossier", hint: "Garde les sous-dossiers", action: () => onImportFolderClick(currentFolderId || undefined) },
              onDriveImportClick && { icon: HardDrive, label: "Depuis Google Drive", hint: "SUP'DOCS ou ton propre Drive", action: () => onDriveImportClick(currentFolderId || undefined) },
            ]
              .filter(Boolean)
              .map((item) => {
                const { icon: Icon, label, hint, action } = item as { icon: React.ElementType; label: string; hint: string; action: () => void };
                return (
                  <button
                    key={label}
                    role="menuitem"
                    type="button"
                    onClick={() => { setAddSheetOpen(false); action(); }}
                    className="flex min-h-14 w-full items-center gap-3.5 rounded-xl px-3 text-left active:bg-white/[0.06]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><Icon className="h-5 w-5" /></span>
                    <span>
                      <span className="block text-[15px] text-zinc-100">{label}</span>
                      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
                    </span>
                  </button>
                );
              })}
            {currentFolder && canCreateFolder && (
              <button
                type="button"
                role="menuitem"
                onClick={(event) => { setAddSheetOpen(false); void handleDeleteFolder(currentFolder, event); }}
                className="mt-1 flex min-h-12 w-full items-center gap-3.5 rounded-xl border-t border-white/[0.06] px-3 text-left text-sm text-rose-300 active:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" /> Supprimer le dossier « {currentFolder.name} »
              </button>
            )}
          </div>
        </div>
      )}

      {showNewFolderInput && canCreateFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creatingFolder) {
              setShowNewFolderInput(false);
              setNewFolderName("");
            }
          }}
        >
          <form
            onSubmit={handleCreateFolder}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-folder-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#dadce0] bg-white shadow-2xl dark:border-white/10 dark:bg-[#262A33]"
          >
            <div className="flex items-start gap-3 border-b border-[#e8eaed] p-4 dark:border-white/[0.08] sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Folder className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id="new-folder-title" className="text-base font-semibold text-zinc-900 dark:text-white">Nouveau dossier</h2>
                <p className="mt-1 text-xs text-zinc-500">{currentFolder ? `Créer dans « ${currentFolder.name} »` : `Créer dans « ${rootLabel} »`}</p>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                disabled={creatingFolder}
                onClick={() => {
                  setShowNewFolderInput(false);
                  setNewFolderName("");
                }}
                className="-mr-1 -mt-1 rounded-full p-2 text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <label htmlFor="new-folder-name" className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Nom du dossier
              </label>
              <input
                id="new-folder-name"
                autoFocus
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="Ex. Cours du semestre"
                maxLength={120}
                className="h-12 w-full rounded-xl border border-[#dadce0] bg-transparent px-3.5 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-white/10 dark:placeholder:text-zinc-600"
              />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={creatingFolder}
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName("");
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dadce0] px-4 text-sm font-medium text-zinc-600 transition hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim() || creatingFolder}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingFolder && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  Créer
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <main className="flex-1 space-y-4 px-4 py-4 sm:px-7">
        {visibleFolders.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Dossiers</h2>
              <span className="rounded-full bg-[#f1f3f4] px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
                {visibleFolders.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleFolders.map((folder) => (
                <div
                  key={folder.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setCurrentFolderId(folder.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setCurrentFolderId(folder.id);
                  }}
                  className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-[#dadce0] bg-white px-3 py-2.5 transition hover:border-[#c4c7c5] hover:bg-[#f1f3f4] dark:border-white/[0.09] dark:bg-[#272B34] dark:hover:bg-[#303541]"
                >
                  <Folder className="h-5 w-5 shrink-0 fill-emerald-200 text-emerald-600 dark:fill-emerald-500/20 dark:text-emerald-400" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{folder.name}</span>
                  <button
                    type="button"
                    onClick={(event) => handleDeleteFolder(folder, event)}
                    title="Supprimer le dossier"
                    aria-label={`Supprimer le dossier ${folder.name}`}
                    className="hidden rounded-full p-1.5 text-zinc-500 transition hover:bg-black/5 hover:text-rose-600 sm:inline-flex sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Fichiers</h2>
              <span className="rounded-full bg-[#f1f3f4] px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
                {displayedFiles.length}
              </span>
            </div>
            {displayedFiles.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setSortKey((key) => (key === "name" ? "modified" : key === "modified" ? "size" : "name"));
                  setSortAscending(true);
                }}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition hover:bg-[#f1f3f4] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                title={`Tri actuel : ${sortKey}`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortKey === "name" ? "Nom" : sortKey === "modified" ? "Modifié" : "Taille"}
              </button>
            )}
          </div>
          {loading ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#dadce0] text-sm text-zinc-500 dark:border-white/10">
              <LoaderCircle className="h-6 w-6 animate-spin text-emerald-500" />
              Chargement…
            </div>
          ) : displayedFiles.length === 0 && visibleFolders.length > 0 && !isTrashView ? null : displayedFiles.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#dadce0] px-5 py-8 text-center dark:border-white/10">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                {isTrashView ? <Trash2 className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
              </div>
              <h3 className="text-sm font-medium">
                {emptyState.title}
              </h3>
              <p className="mt-1 max-w-md text-xs text-zinc-500">
                {emptyState.text}
              </p>
              {canAddFiles && (
                <button
                  type="button"
                  onClick={() => onNewFileClick(currentFolderId || undefined)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Ajouter un fichier
                </button>
              )}
            </div>
          ) : (
            <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {openMenuId && (
                <button
                  type="button"
                  aria-label="Fermer les options du fichier"
                  onClick={() => setOpenMenuId(null)}
                  className="absolute inset-0 z-10 cursor-default bg-zinc-950/10 backdrop-blur-[2px]"
                />
              )}
              {displayedFiles.map((file, index) => (
                <article
                  key={file.id}
                  onClick={() => onOpenFile(file)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onOpenFile(file);
                  }}
                  role="button"
                  tabIndex={0}
                  className={`group relative flex min-w-0 cursor-pointer flex-col overflow-visible rounded-xl border bg-white transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-md dark:bg-[#2B2F37] ${openMenuId === file.id ? "z-30 border-emerald-500 shadow-xl ring-2 ring-emerald-500/25 dark:border-emerald-400 dark:ring-emerald-400/20" : "border-[#dadce0] dark:border-white/[0.09]"}`}
                >
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-xl bg-[#f8fafd] dark:bg-[#252931]">
                    {file.thumbnail_path || getExtension(file) === "pdf" ? (
                      <img
                        src={fileUrl(`/drive/files/${file.id}/thumbnail`)}
                        alt={`Aperçu de ${file.name}`}
                        loading="lazy"
                        className="h-full w-full rounded-t-xl object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-4 text-center">
                        <DocumentTypeIcon extension={getExtension(file)} className="h-12 w-12" />
                        <span className="line-clamp-2 text-[10px] text-zinc-500">{file.summary || file.content || "Document"}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId((id) => (id === file.id ? null : file.id));
                      }}
                      aria-label={`Options pour ${file.name}`}
                      className="absolute right-1 top-1 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-zinc-700 shadow-sm transition hover:bg-white dark:bg-[#2D3139]/95 dark:text-zinc-100 dark:hover:bg-[#383D47]"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {openMenuId === file.id && (
                    <FileActionMenu
                      file={file}
                      alignLeft={index % 2 === 0}
                      isTrashView={isTrashView}
                      canAskAI={Boolean(onAskAIAboutFile)}
                      busy={busyFileId === file.id}
                      onOpen={() => { setOpenMenuId(null); onOpenFile(file); }}
                      onShare={() => { setOpenMenuId(null); onOpenShare(file); }}
                      onStar={() => handleToggleStar(file)}
                      onDownload={() => handleDownload(file)}
                      onDelete={() => handleTrashOrDelete(file)}
                      onRestore={() => handleRestore(file)}
                      onAskAI={() => { setOpenMenuId(null); onAskAIAboutFile?.(file); }}
                    />
                  )}
                  <div className="flex min-w-0 items-center gap-2 p-2.5">
                    <DocumentTypeIcon extension={getExtension(file)} className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium" title={file.name}>{file.name}</p>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] text-zinc-500">
                        <StudentDocBadge
                          info={classifyFile(file, folders.find((folder) => folder.id === file.folder_id)?.name)}
                          compact
                        />
                        <span className="truncate">{formatFileSize(file.size_bytes)}</span>
                      </p>
                    </div>
                    {file.is_starred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FileActionMenu({
  file,
  alignLeft,
  isTrashView,
  canAskAI,
  busy,
  onOpen,
  onShare,
  onStar,
  onDownload,
  onDelete,
  onRestore,
  onAskAI,
}: {
  file: DriveFile;
  alignLeft: boolean;
  isTrashView: boolean;
  canAskAI: boolean;
  busy: boolean;
  onOpen: () => void;
  onShare: () => void;
  onStar: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onAskAI: () => void;
}) {
  const itemClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-[#f1f3f4] disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-white/[0.08]";

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      className={`absolute top-12 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-emerald-500/35 bg-white p-1.5 shadow-2xl ring-1 ring-emerald-500/10 dark:border-emerald-400/30 dark:bg-[#30343E] dark:ring-emerald-400/10 ${alignLeft ? "left-2 right-auto" : "right-2 left-auto"}`}
    >
      <button type="button" disabled={busy} onClick={onOpen} className={itemClass}>
        <Eye className="h-4 w-4 text-zinc-500" />
        Ouvrir le fichier
      </button>
      {isTrashView ? (
        <button type="button" disabled={busy} onClick={onRestore} className={itemClass}>
          <RotateCcw className="h-4 w-4 text-emerald-600" />
          Restaurer
        </button>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={onShare} className={itemClass}>
            <Share2 className="h-4 w-4 text-zinc-500" />
            Partager
          </button>
          <button type="button" disabled={busy} onClick={onStar} className={itemClass}>
            <Star className={`h-4 w-4 ${file.is_starred ? "fill-amber-400 text-amber-400" : "text-zinc-500"}`} />
            {file.is_starred ? "Retirer des favoris" : "Ajouter aux favoris"}
          </button>
          {canAskAI && (
            <button type="button" disabled={busy} onClick={onAskAI} className={itemClass}>
              <Sparkles className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              Interroger Lekki AI
            </button>
          )}
          <button type="button" disabled={busy} onClick={onDownload} className={itemClass}>
            <Download className="h-4 w-4 text-zinc-500" />
            Télécharger
          </button>
        </>
      )}
      <div className="my-1 border-t border-[#e8eaed] dark:border-white/[0.08]" />
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className={`${itemClass} ${isTrashView ? "text-rose-600 dark:text-rose-300" : ""}`}
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-rose-500" />}
        {isTrashView ? "Supprimer définitivement" : "Mettre à la corbeille"}
      </button>
    </div>
  );
}
