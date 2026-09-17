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
  activeWorkspaceId?: string | null;
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
  activeWorkspaceId,
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

  React.useEffect(() => {
    setCurrentFolderId(null);
    setShowNewFolderInput(false);
  }, [currentView]);

  const visibleFolders = folders.filter((f) => {
    if (!["my_docs", "workspace_files"].includes(currentView)) return false;
    if (isPersonalScope) return !f.workspace_id;
    return Boolean(f.workspace_id);
  });

  const currentFolder = visibleFolders.find((f) => f.id === currentFolderId);

  // Filter files
  const displayedFiles = files.filter((file) => {
    if (currentFolder?.id) {
      return file.folder_id === currentFolder.id;
    }
    // If at root of a folder-capable view, show files with no folder or root
    if (currentView === "workspace_files" || currentView === "my_docs") {
      return !file.folder_id;
    }
    return true;
  });

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

  const handleEmptyTrash = async () => {
    if (displayedFiles.length === 0) {
      toast.info("La corbeille est déjà vide");
      return;
    }

    try {
      await Promise.all(displayedFiles.map((file) => drive.deleteFile(file.id, true)));
      toast.success("Corbeille vidée");
      onRefresh();
    } catch {
      toast.error("Impossible de vider complètement la corbeille");
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await drive.createFolder({
        name: newFolderName.trim(),
        workspace_id: isPersonalScope ? null : (currentFolder?.workspace_id || activeWorkspaceId || null),
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

  const handleDeleteFolder = async (folder: DriveFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer le dossier « ${folder.name} » ?`)) return;

    try {
      await drive.deleteFolder(folder.id);
      if (currentFolderId === folder.id) setCurrentFolderId(null);
      toast.success(`Dossier « ${folder.name} » supprimé`);
      onRefresh();
    } catch {
      toast.error("Impossible de supprimer ce dossier : il doit être vide");
    }
  };

  return (
    <div id="drive-view-container" className="flex-1 flex flex-col min-w-0 bg-[#0E1116] overflow-y-auto">
      {/* View Header */}
      <div className="px-4 py-3 border-b border-zinc-800/80 bg-[#11141A]/70">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 min-w-0">
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className={`hover:text-emerald-400 transition-colors truncate ${
                    !currentFolder ? "text-emerald-400 font-semibold" : ""
                  }`}
                >
                  {currentView === "trash"
                    ? "Corbeille"
                    : currentView === "starred"
                      ? "Favoris"
                      : currentView === "shared_with_me"
                        ? "Partagés avec moi"
                        : currentView === "my_docs"
                          ? "Mes documents"
                          : "Fichiers partagés"}
                </button>
            {currentFolder && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                <span className="text-emerald-400 font-semibold truncate">
                  📁 {currentFolder.name}
                </span>
              </>
            )}
          </div>

          {currentView === "trash" ? (
            <button
              onClick={handleEmptyTrash}
              aria-label="Vider la corbeille"
              title="Vider la corbeille"
              className="flex h-8 items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 text-xs font-semibold text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Vider la corbeille</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowNewFolderInput((prev) => !prev)}
                aria-label="Nouveau dossier"
                title="Nouveau dossier"
                className="flex h-8 items-center gap-1.5 rounded-lg bg-zinc-800 px-3 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors text-xs font-medium"
              >
                <FolderPlus className="h-3.5 w-3.5 text-emerald-400" />
                <span>Nouveau dossier</span>
              </button>

              <button
                onClick={() => onNewFileClick(currentFolderId || undefined)}
                aria-label="Déposer un document"
                title="Déposer un document"
                className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm text-xs font-semibold"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Déposer un document</span>
              </button>
            </div>
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
          <div className="space-y-3">
            <div className="text-sm font-medium text-zinc-200">
              Dossiers
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {visibleFolders.map((folder) => {
                return (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentFolderId(folder.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setCurrentFolderId(folder.id);
                      }
                    }}
                    className="p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 text-left transition-all flex items-center justify-between group shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentFolderId(folder.id);
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <Folder className="h-5 w-5 text-zinc-400 group-hover:text-emerald-400 transition-colors shrink-0 fill-zinc-400/20 group-hover:fill-emerald-400/20" />
                      <div className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 truncate">
                        {folder.name}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFolder(folder, e)}
                      aria-label={`Supprimer le dossier ${folder.name}`}
                      title="Supprimer le dossier"
                      className="p-1.5 rounded text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Files Section */}
        <div className="space-y-3 pt-2">
          <div className="text-sm font-medium text-zinc-200 flex items-center justify-between">
            <span>Fichiers</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayedFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => onOpenFile(file)}
                  className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden hover:bg-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group flex flex-col aspect-[4/3] sm:aspect-square relative"
                >
                  {/* File Preview Area (Mocked with icon for now) */}
                  <div className="flex-1 bg-zinc-950/50 flex flex-col items-center justify-center relative overflow-hidden">
                    {file.thumbnail_path ? (
                      <img
                        src={`/api/v1/drive/files/${file.id}/thumbnail`}
                        alt={`Aperçu de ${file.name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-3">
                        <div className="transform scale-150 opacity-40 group-hover:scale-125 transition-transform duration-500 text-zinc-600">
                          {getDocIcon(file.extension)}
                        </div>
                        <p className="line-clamp-4 text-center text-[10px] leading-relaxed text-zinc-500">
                          {file.summary || file.content || "Aucun aperçu disponible"}
                        </p>
                      </div>
                    )}
                    
                    {/* Action Overlay */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/80 p-1.5 rounded-lg backdrop-blur-sm border border-zinc-800/80" onClick={(e) => e.stopPropagation()}>
                      {currentView === "trash" ? (
                        <>
                          <button
                            onClick={(e) => handleRestore(file, e)}
                            className="p-1.5 rounded hover:bg-zinc-700 text-emerald-400"
                            title="Restaurer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleTrashOrDelete(file, e)}
                            className="p-1.5 rounded hover:bg-zinc-700 text-rose-400"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const downloadUrl = `/api/v1/drive/files/${file.id}/download`;
                              const link = document.createElement("a");
                              link.href = downloadUrl;
                              link.setAttribute("download", file.name);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success(`Téléchargement de « ${file.name} »`);
                            }}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white"
                            title="Télécharger"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          {onAskAIAboutFile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskAIAboutFile(file);
                              }}
                              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400"
                              title="Interroger avec Lekki AI"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleToggleStar(file, e)}
                            className={`p-1.5 rounded hover:bg-zinc-800 ${
                              file.is_starred ? "text-amber-400" : "text-zinc-300 hover:text-white"
                            }`}
                            title="Favoris"
                          >
                            <Star className="h-3.5 w-3.5" fill={file.is_starred ? "currentColor" : "none"} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenShare(file);
                            }}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-sky-400"
                            title="Partager"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleTrashOrDelete(file, e)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-rose-400"
                            title="Corbeille"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* File Info Footer */}
                  <div className="p-3 border-t border-zinc-800/80 bg-[#161A22] shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="shrink-0 p-1 bg-zinc-800/50 rounded">
                        {getDocIcon(file.extension)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[11px] sm:text-xs text-zinc-300 group-hover:text-zinc-100 truncate" title={file.name}>
                          {file.name}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
