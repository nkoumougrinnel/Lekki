import React, { useState } from "react";
import { DriveFile, DriveFolder, FileExtension, User, NavView } from "@/types/lekki";
import { drive } from "@/lib/api";
import { toast } from "sonner";
import {
  Folder,
  FolderPlus,
  FileText,
  FileSpreadsheet,
  FileCode,
  Star,
  Share2,
  Trash2,
  Eye,
  Download,
  Upload,
  ChevronRight,
  MoreVertical,
  RotateCcw,
  Sparkles,
  Layers,
  Calendar,
  Lock,
  Globe,
} from "lucide-react";

interface DriveViewProps {
  currentView: NavView;
  files: DriveFile[];
  folders: DriveFolder[];
  activeWorkspaceName?: string;
  currentUser: User | null;
  onOpenFile: (file: DriveFile) => void;
  onOpenShare: (file: DriveFile) => void;
  onNewFileClick: (folderId?: string) => void;
  onRefresh: () => void;
  onAskAIAboutFile?: (file: DriveFile) => void;
}

export function DriveView({
  currentView,
  files,
  folders,
  activeWorkspaceName,
  currentUser,
  onOpenFile,
  onOpenShare,
  onNewFileClick,
  onRefresh,
  onAskAIAboutFile,
}: DriveViewProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // Filter folders for current scope
  const isPersonalScope =
    currentView === "my_docs" ||
    currentView === "starred" ||
    currentView === "shared_with_me" ||
    currentView === "trash";

  const visibleFolders = folders.filter((f) => {
    if (isPersonalScope) return !f.workspace_id;
    return Boolean(f.workspace_id);
  });

  const currentFolder = visibleFolders.find((f) => f.id === currentFolderId);

  // Filter files
  const displayedFiles = files.filter((file) => {
    if (currentFolderId) {
      return file.folder_id === currentFolderId;
    }
    // If at root of a folder-capable view, show files with no folder or root
    if (currentView === "workspace_files" || currentView === "my_docs") {
      return !file.folder_id;
    }
    return true;
  });

  const getViewTitle = () => {
    switch (currentView) {
      case "my_docs":
        return "Mon Espace — Mes documents personnels";
      case "starred":
        return "Favoris";
      case "shared_with_me":
        return "Partagés avec moi";
      case "trash":
        return "Corbeille";
      case "workspace_files":
        return `${activeWorkspaceName || "Workspace"} — Fichiers & Cours`;
      default:
        return "Documents";
    }
  };

  const getViewDescription = () => {
    switch (currentView) {
      case "my_docs":
        return "Vos fichiers et dossiers privés. Vous seul y avez accès sauf si vous choisissez de les partager.";
      case "starred":
        return "Vos documents épinglés pour un accès rapide.";
      case "shared_with_me":
        return "Ressources que d'autres collaborateurs ont partagées directement avec vous.";
      case "trash":
        return "Éléments supprimés temporairement.";
      case "workspace_files":
        return "Bibliothèque documentaire partagée entre tous les membres du Workspace actif.";
      default:
        return "";
    }
  };

  const getDocIcon = (ext: FileExtension) => {
    switch (ext) {
      case "pdf":
        return <FileText className="h-4 w-4 text-rose-400" />;
      case "docx":
        return <FileSpreadsheet className="h-4 w-4 text-sky-400" />;
      case "pptx":
        return <FileText className="h-4 w-4 text-amber-400" />;
      case "md":
      case "txt":
        return <FileCode className="h-4 w-4 text-emerald-400" />;
      default:
        return <FileText className="h-4 w-4 text-zinc-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleToggleStar = async (file: DriveFile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await drive.updateFile(file.id, { is_starred: !file.is_starred });
      toast.success(
        file.is_starred
          ? `« ${file.name} » retiré des favoris`
          : `« ${file.name} » ajouté aux favoris`
      );
      onRefresh();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleTrashOrDelete = async (file: DriveFile, e: React.MouseEvent) => {
    e.stopPropagation();
    const isTrashView = currentView === "trash";
    try {
      if (isTrashView) {
        await drive.deleteFile(file.id, true);
        toast.success("Document définitivement supprimé");
      } else {
        await drive.updateFile(file.id, { is_deleted: true });
        toast.success(`« ${file.name} » déplacé dans la corbeille`);
      }
      onRefresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleRestore = async (file: DriveFile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await drive.updateFile(file.id, { is_deleted: false });
      toast.success(`« ${file.name} » restauré`);
      onRefresh();
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await drive.createFolder({
        name: newFolderName.trim(),
        workspace_id: isPersonalScope ? null : (folders[0]?.workspace_id || null),
        parent_id: currentFolderId || null,
      });
      toast.success(`Dossier « ${newFolderName} » créé`);
      setNewFolderName("");
      setShowNewFolderInput(false);
      onRefresh();
    } catch {
      toast.error("Erreur lors de la création du dossier");
    }
  };

  return (
    <div id="drive-view-container" className="flex-1 flex flex-col min-w-0 bg-[#0E1116] overflow-y-auto">
      {/* View Header */}
      <div className="p-6 border-b border-border/60 bg-[#11141A]/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              {getViewTitle()}
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              {getViewDescription()}
            </p>
          </div>

          {currentView !== "trash" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewFolderInput((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
              >
                <FolderPlus className="h-3.5 w-3.5 text-emerald-400" />
                <span>Nouveau dossier</span>
              </button>

              <button
                onClick={() => onNewFileClick(currentFolderId || undefined)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Déposer un document</span>
              </button>
            </div>
          )}
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-4 pt-3 border-t border-zinc-800/80 font-mono">
          <button
            onClick={() => setCurrentFolderId(null)}
            className={`hover:text-emerald-400 transition-colors ${
              !currentFolderId ? "text-emerald-400 font-semibold" : ""
            }`}
          >
            Racine
          </button>
          {currentFolder && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
              <span className="text-emerald-400 font-semibold">
                📁 {currentFolder.name}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Create Folder inline form */}
        {showNewFolderInput && (
          <form
            onSubmit={handleCreateFolder}
            className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-700/80 flex items-center gap-2.5 animate-in fade-in"
          >
            <Folder className="h-4 w-4 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du nouveau dossier (ex: Cours, Examens, TP...)"
              className="flex-1 bg-zinc-950 px-3 py-1.5 rounded text-xs text-zinc-100 border border-zinc-700 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-emerald-500 text-zinc-950 font-semibold text-xs hover:bg-emerald-400 transition-colors"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => setShowNewFolderInput(false)}
              className="px-2.5 py-1.5 rounded text-zinc-400 hover:text-zinc-200 text-xs"
            >
              Annuler
            </button>
          </form>
        )}

        {/* Folders Grid (shown if at root and folders exist) */}
        {!currentFolderId && visibleFolders.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] uppercase font-mono tracking-wider text-zinc-400 font-semibold">
              Dossiers ({visibleFolders.length})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {visibleFolders.map((folder) => {
                const folderItemCount = files.filter(
                  (f) => f.folder_id === folder.id && !f.is_deleted
                ).length;
                return (
                  <button
                    key={folder.id}
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="p-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 text-left transition-all flex items-center gap-2.5 group shadow-sm"
                  >
                    <Folder className="h-5 w-5 text-emerald-400/90 group-hover:scale-105 transition-transform shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-zinc-200 group-hover:text-emerald-300 truncate">
                        {folder.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {folderItemCount} {folderItemCount > 1 ? "fichiers" : "fichier"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Files Section */}
        <div className="space-y-2">
          <div className="text-[11px] uppercase font-mono tracking-wider text-zinc-400 font-semibold flex items-center justify-between">
            <span>Documents ({displayedFiles.length})</span>
            <span className="text-zinc-400 font-normal normal-case text-xs">
              Ressources originales directement indexées
            </span>
          </div>

          {displayedFiles.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 p-8 space-y-3">
              <FileText className="h-10 w-10 mx-auto text-zinc-600" />
              <div className="text-sm font-medium text-zinc-300">
                Aucun document dans cet emplacement
              </div>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {currentView === "trash"
                  ? "La corbeille est vide."
                  : "Déposez un cours, un TD ou un rapport pour le stocker et le rendre disponible pour la recherche et Lekki AI."}
              </p>
              {currentView !== "trash" && (
                <button
                  onClick={() => onNewFileClick(currentFolderId || undefined)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Ajouter un premier document
                </button>
              )}
            </div>
          ) : (
            <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-[#12151B]">
              <div className="grid grid-cols-12 px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <div className="col-span-6 sm:col-span-5">Nom du document</div>
                <div className="col-span-3 sm:col-span-2 hidden sm:block">Auteur / Accès</div>
                <div className="col-span-3 sm:col-span-2 hidden md:block">Taille & Pages</div>
                <div className="col-span-3 sm:col-span-2 hidden lg:block">Modifié le</div>
                <div className="col-span-6 sm:col-span-3 lg:col-span-1 text-right">Actions</div>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {displayedFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => onOpenFile(file)}
                    className="grid grid-cols-12 px-4 py-3 items-center hover:bg-zinc-800/40 transition-colors cursor-pointer group text-xs text-zinc-300"
                  >
                    {/* File Name & Format */}
                    <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0 pr-2">
                      <div className="p-1.5 rounded bg-zinc-800/80 border border-zinc-700/60 shrink-0">
                        {getDocIcon(file.extension)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                          {file.name}
                        </div>
                        {file.summary && (
                          <div className="text-[11px] text-zinc-400 line-clamp-1">
                            {file.summary}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Owner & Access Badges */}
                    <div className="col-span-3 sm:col-span-2 hidden sm:flex items-center gap-1.5">
                      {file.workspace_id ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Globe className="h-2.5 w-2.5" /> Workspace
                        </span>
                      ) : file.shared_with.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <Share2 className="h-2.5 w-2.5" /> Partagé ({file.shared_with.length})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                          <Lock className="h-2.5 w-2.5" /> Privé
                        </span>
                      )}
                    </div>

                    {/* Size & Pages */}
                    <div className="col-span-3 sm:col-span-2 hidden md:block text-zinc-400 font-mono text-[11px]">
                      {file.page_count ? `${file.page_count} p. • ` : ""}
                      {formatFileSize(file.size_bytes)}
                    </div>

                    {/* Updated At */}
                    <div className="col-span-3 sm:col-span-2 hidden lg:block text-zinc-400 text-[11px]">
                      {new Date(file.updated_at).toLocaleDateString("fr-FR")}
                    </div>

                    {/* Actions */}
                    <div className="col-span-6 sm:col-span-3 lg:col-span-1 flex items-center justify-end gap-1">
                      {currentView === "trash" ? (
                        <>
                          <button
                            onClick={(e) => handleRestore(file, e)}
                            className="p-1 rounded hover:bg-zinc-700 text-emerald-400"
                            title="Restaurer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleTrashOrDelete(file, e)}
                            className="p-1 rounded hover:bg-zinc-700 text-rose-400"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {onAskAIAboutFile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskAIAboutFile(file);
                              }}
                              className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400"
                              title="Interroger ce fichier avec Lekki AI"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleToggleStar(file, e)}
                            className={`p-1 rounded hover:bg-zinc-700 ${
                              file.is_starred ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"
                            }`}
                            title={file.is_starred ? "Retirer des favoris" : "Ajouter aux favoris"}
                          >
                            <Star className="h-3.5 w-3.5" fill={file.is_starred ? "currentColor" : "none"} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenShare(file);
                            }}
                            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-sky-400"
                            title="Partager"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleTrashOrDelete(file, e)}
                            className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-rose-400"
                            title="Mettre à la corbeille"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
