import React, { useEffect, useRef, useState } from "react";
import { DriveFolder, DriveFile } from "@/types/lekki";
import { ApiError, drive } from "@/lib/api";
import { toast } from "sonner";
import {
  Upload,
  Folder,
  FileText,
  X,
  CheckCircle2,
  LoaderCircle,
  ArrowRight,
  ChevronRight,
  FolderPlus,
} from "lucide-react";

interface ImportFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: DriveFolder[];
  defaultWorkspaceId?: string | null;
  defaultFolderId?: string | null;
  onImportCompleted: (files: DriveFile[]) => void | Promise<void>;
}

const SUPPORTED_EXTENSIONS = ["pdf", "docx", "pptx", "txt", "md"];

interface ImportNode {
  id: string;
  type: "file" | "folder";
  name: string;
  relativePath: string;
  parentPath: string | null;
  file?: File;
  children: ImportNode[];
  serverFolderId?: string | null;
}

function getExtension(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && SUPPORTED_EXTENSIONS.includes(ext)) return ext;
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function ImportFolderDialog({
  open,
  onOpenChange,
  folders,
  defaultWorkspaceId,
  defaultFolderId,
  onImportCompleted,
}: ImportFolderDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tree, setTree] = useState<ImportNode[]>([]);
  const [destinationMode, setDestinationMode] = useState<"root" | "folder">("root");
  const [destinationFolderId, setDestinationFolderId] = useState<string | null>(defaultFolderId || null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importedFiles, setImportedFiles] = useState<DriveFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSelectedFiles([]);
    setTree([]);
    setImportedFiles([]);
    setErrors([]);
    setDone(false);
    setProgress(0);
    setUploading(false);
    setDestinationMode("root");
    setDestinationFolderId(defaultFolderId || null);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.setAttribute("webkitdirectory", "");
      inputRef.current.setAttribute("directory", "");
      inputRef.current.setAttribute("multiple", "");
      inputRef.current.setAttribute("accept", ".pdf,.docx,.pptx,.txt,.md");
    }
  }, [open, defaultFolderId]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploading) onOpenChange(false);
    };
    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, uploading, onOpenChange]);

  const handleClose = () => {
    if (uploading) return;
    onOpenChange(false);
  };

  const buildTree = (files: File[]): ImportNode[] => {
    const virtualRoot: ImportNode = {
      id: "",
      type: "folder",
      name: "Racine",
      relativePath: "",
      parentPath: null,
      children: [],
      serverFolderId: null,
    };
    const folderByPath = new Map<string, ImportNode>([["", virtualRoot]]);

    for (const file of files) {
      const fileWithPath = file as File & { webkitRelativePath?: string };
      const rel = fileWithPath.webkitRelativePath || file.name;
      const parts = rel.split("/").filter(Boolean);
      if (parts.length === 0) continue;
      const fileName = parts.pop()!;
      let parent = virtualRoot;
      let dirPath = "";
      for (const part of parts) {
        dirPath = dirPath ? `${dirPath}/${part}` : part;
        let child = folderByPath.get(dirPath);
        if (!child) {
          const grandParentPath = dirPath.includes("/") ? dirPath.slice(0, dirPath.lastIndexOf("/")) : null;
          child = {
            id: dirPath,
            type: "folder",
            name: part,
            relativePath: dirPath,
            parentPath: grandParentPath,
            children: [],
            serverFolderId: null,
          };
          folderByPath.set(dirPath, child);
          parent.children.push(child);
        }
        parent = child;
      }
      parent.children.push({
        id: `${dirPath ? dirPath + "/" : ""}${fileName}`,
        type: "file",
        name: fileName,
        relativePath: rel,
        parentPath: dirPath || null,
        file,
        children: [],
      });
    }

    return virtualRoot.children;
  };

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const unsupported = files.filter((f) => !getExtension(f.name));
    if (unsupported.length > 0) {
      toast.info(
        `${unsupported.length} fichier${unsupported.length > 1 ? "s" : ""} laissé${unsupported.length > 1 ? "s" : ""} de côté (images et autres formats non lus).`
      );
    }
    const supported = files.filter((f) => getExtension(f.name));
    setSelectedFiles(supported);
    setTree(buildTree(supported));
    setImportedFiles([]);
    setErrors([]);
    setProgress(0);
    event.target.value = "";
  };

  const countFiles = (nodes: ImportNode[]): number => {
    let total = 0;
    for (const node of nodes) {
      if (node.type === "file") total += 1;
      else total += countFiles(node.children);
    }
    return total;
  };

  const totalFiles = countFiles(tree);

  const collectFolders = (nodes: ImportNode[]): ImportNode[] => {
    const out: ImportNode[] = [];
    const walk = (list: ImportNode[]) => {
      for (const node of list) {
        if (node.type === "folder") {
          out.push(node);
          walk(node.children);
        }
      }
    };
    walk(nodes);
    return out.sort(
      (a, b) => a.relativePath.split("/").length - b.relativePath.split("/").length
    );
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0 || uploading || tree.length === 0) return;
    setUploading(true);
    setErrors([]);
    setProgress(0);

    const failures: string[] = [];
    const imported: DriveFile[] = [];
    try {
      const foldersInOrder = collectFolders(tree);
      const pathToServerFolderId = new Map<string, string>();
      // Dossiers déjà présents : on les réutilise, pour qu'un second import complète le premier.
      const existing = new Map<string, string>();
      for (const folder of folders) {
        if ((folder.workspace_id || null) !== (defaultWorkspaceId || null)) continue;
        existing.set(`${folder.parent_id || ""}/${folder.name.trim().toLowerCase()}`, folder.id);
      }
      const rootParent = destinationMode === "folder" ? destinationFolderId || null : null;
      const totalSteps = foldersInOrder.length + totalFiles;
      let done = 0;
      const tick = () => setProgress(Math.round((++done / Math.max(totalSteps, 1)) * 100));

      // 1. L'arborescence, des dossiers parents vers les enfants.
      for (const folder of foldersInOrder) {
        const parentId = folder.parentPath ? pathToServerFolderId.get(folder.parentPath) ?? null : rootParent;
        const key = `${parentId || ""}/${folder.name.trim().toLowerCase()}`;
        let serverId = existing.get(key);
        if (!serverId) {
          const created = await drive.createFolder({
            name: folder.name,
            workspace_id: defaultWorkspaceId || null,
            parent_id: parentId,
          });
          serverId = created.id;
          existing.set(key, serverId);
        }
        pathToServerFolderId.set(folder.relativePath, serverId);
        tick();
      }

      // 2. Les fichiers, un par un : un document illisible n'arrête pas les autres.
      const entries: { file: File; folderId: string | null; path: string }[] = [];
      const collectFiles = (list: ImportNode[]) => {
        for (const node of list) {
          if (node.type === "file") {
            entries.push({
              file: node.file!,
              folderId: node.parentPath ? pathToServerFolderId.get(node.parentPath) ?? null : rootParent,
              path: node.relativePath,
            });
          } else {
            collectFiles(node.children);
          }
        }
      };
      collectFiles(tree);

      for (const entry of entries) {
        try {
          const result = await drive.importFiles({
            files: [entry.file],
            folder_ids: [entry.folderId],
            workspace_id: defaultWorkspaceId || null,
          });
          if (result.length) imported.push(...result);
          else failures.push(`${entry.path} : aucun texte lisible (scan sans OCR ?)`);
        } catch (error) {
          failures.push(`${entry.path} : ${error instanceof ApiError ? error.message : "envoi impossible"}`);
        }
        tick();
        setImportedFiles([...imported]);
      }

      setProgress(100);
      setErrors(failures);
      setDone(true);
      await onImportCompleted(imported);
      if (imported.length) {
        toast.success(
          `${imported.length} document${imported.length > 1 ? "s" : ""} importé${imported.length > 1 ? "s" : ""}` +
            (failures.length ? `, ${failures.length} ignoré${failures.length > 1 ? "s" : ""}.` : ".")
        );
      } else {
        toast.error("Aucun document n’a pu être importé.");
      }
    } catch (error) {
      setErrors([
        error instanceof ApiError ? error.message : "L’import s’est arrêté : vérifie ta connexion et relance-le.",
        ...failures,
      ]);
      if (imported.length) await onImportCompleted(imported);
      toast.error("L’import s’est arrêté avant la fin.");
    } finally {
      setUploading(false);
    }
  };

  const renderTree = (nodes: ImportNode[], depth = 0): React.ReactNode => (
    <>
      {nodes.map((node) => (
        <React.Fragment key={node.id}>
        <div className="flex items-center gap-2 py-0.5 text-xs" style={{ paddingLeft: depth * 16 }}>
          {node.type === "folder" ? (
            <>
              <ChevronRight className="h-3 w-3 shrink-0 text-zinc-500" />
              <Folder className="h-3 w-3 shrink-0 text-zinc-400" />
              <span className="text-zinc-300">{node.name}</span>
            </>
          ) : (
            <>
              <FileText className="h-3 w-3 shrink-0 text-zinc-500" />
              <span className="truncate min-w-0 text-zinc-300" title={node.name}>
                {node.name}
              </span>
              <span className="ml-auto text-[10px] text-zinc-500">{formatFileSize(node.file!.size)}</span>
            </>
          )}
        </div>
        {node.type === "folder" && renderTree(node.children, depth + 1)}
        </React.Fragment>
      ))}
    </>
  );

  const renderDestinationFolders = (list: DriveFolder[], depth = 0): React.ReactNode => (
    <>
      {list.map((folder) => {
        const children = folders.filter((f) => f.parent_id === folder.id);
        const isSelected = destinationFolderId === folder.id;
        return (
          <label
            key={folder.id}
            onClick={(e) => {
              e.stopPropagation();
              setDestinationMode("folder");
              setDestinationFolderId(folder.id);
            }}
            className="flex items-center gap-2 cursor-pointer select-none py-1 px-2 rounded hover:bg-zinc-800/50"
          >
            <input
              type="radio"
              name="destination"
              checked={isSelected}
              onChange={() => {
                setDestinationMode("folder");
                setDestinationFolderId(folder.id);
              }}
              className="shrink-0 text-emerald-400"
            />
            <div className="flex shrink-0 items-center gap-1" style={{ paddingLeft: depth * 12 }}>
              <Folder className="h-3 w-3 text-zinc-500" />
              <span className={`truncate min-w-0 ${isSelected ? "text-emerald-300 font-medium" : "text-zinc-300"}`}>
                {folder.name}
              </span>
            </div>
          </label>
        );
      })}
    </>
  );

  if (!open) return null;

  return (
    <div
      id="import-folder-dialog-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section
        id="import-folder-dialog-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-folder-dialog-title"
        className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#12161d] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10">
              <FolderPlus className="h-[18px] w-[18px] text-emerald-300" />
            </div>
            <div>
              <h2 id="import-folder-dialog-title" className="text-sm font-semibold text-zinc-100">
                Importer un dossier
              </h2>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Ses sous-dossiers sont conservés, et chaque document est rangé sous sa matière.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            aria-label="Fermer"
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            {done && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {importedFiles.length} document{importedFiles.length > 1 ? "s" : ""} importé{importedFiles.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Ils sont rangés sous leur matière et Lekki AI peut déjà les lire.
                    </p>
                  </div>
                </div>
                {errors.length > 0 && (
                  <div className="rounded-xl border border-amber-300/15 bg-amber-400/[0.05] p-3">
                    <p className="text-xs font-medium text-amber-200">
                      {errors.length} fichier{errors.length > 1 ? "s" : ""} ignoré{errors.length > 1 ? "s" : ""}
                    </p>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] leading-relaxed text-zinc-400">
                      {errors.map((err, i) => (
                        <li key={i} className="break-words">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Sélecteur de dossier */}
            {!done && !selectedFiles.length && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Choisir un dossier et ses sous-dossiers</span>
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleFolderSelect}
                  />
                </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Les sous-dossiers sont recréés automatiquement. Seuls les
                  PDF, DOCX, PPTX, TXT et MD sont importés.
                </p>
              </div>
            )}

            {/* Aperçu de l'arborescence */}
            {!done && selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span className="text-sm font-medium text-zinc-200">
                      {totalFiles} document{totalFiles > 1 ? "s" : ""} à importer
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFiles([]);
                      setTree([]);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    disabled={uploading}
                    className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] disabled:opacity-50"
                    title="Réinitialiser"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  {tree.length === 0 ? (
                    <p className="text-xs text-zinc-500">Aucun fichier détecté.</p>
                  ) : (
                    renderTree(tree)
                  )}
                </div>
              </div>
            )}

            {/* Destination */}
            {!done && selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Destination</div>
                <div className="space-y-2">
                  <label
                    onClick={() => {
                      setDestinationMode("root");
                      setDestinationFolderId(null);
                    }}
                    className="flex items-center gap-2 cursor-pointer select-none py-1.5 px-2 rounded-lg transition-colors hover:bg-white/[0.03]"
                  >
                    <input
                      type="radio"
                      name="destination"
                      checked={destinationMode === "root"}
                      onChange={() => {
                        setDestinationMode("root");
                        setDestinationFolderId(null);
                      }}
                      className="shrink-0 text-emerald-400"
                    />
                    <span className={`text-sm ${destinationMode === "root" ? "text-emerald-300 font-medium" : "text-zinc-200"}`}>
                      À la racine des documents
                    </span>
                  </label>
                  {folders.length > 0 && (
                    <>
                      <label
                        onClick={() => {
                          setDestinationMode("folder");
                          setDestinationFolderId(defaultFolderId || null);
                        }}
                        className="flex items-center gap-2 cursor-pointer select-none py-1.5 px-2 rounded-lg transition-colors hover:bg-white/[0.03]"
                      >
                        <input
                          type="radio"
                          name="destination"
                          checked={destinationMode === "folder" && destinationFolderId === null}
                          onChange={() => {
                            setDestinationMode("folder");
                            setDestinationFolderId(null);
                          }}
                          className="shrink-0 text-emerald-400"
                        />
                        <span className={`text-sm ${destinationMode === "folder" && destinationFolderId === null ? "text-emerald-300 font-medium" : "text-zinc-200"}`}>
                          Dans un dossier existant
                        </span>
                      </label>
                      <div className="ml-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                        {renderDestinationFolders(
                          folders.filter((f) => !f.parent_id)
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions / Progress */}
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] bg-white/[0.015] px-5 py-3.5">
            {done ? (
              <button
                type="button"
                onClick={handleClose}
                className="ml-auto rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
              >
                Terminer
              </button>
            ) : uploading ? (
              <div className="flex w-full flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Import en cours : {importedFiles.length} document{importedFiles.length > 1 ? "s" : ""} lu{importedFiles.length > 1 ? "s" : ""}. Garde cette fenêtre ouverte.</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : selectedFiles.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>Aucun dossier sélectionné</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">PDF, DOCX, PPTX, TXT et MD</span>
                <button
                  type="button"
                  disabled={!selectedFiles.length}
                  onClick={handleImport}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importer
                </button>
              </div>
            )}
          </footer>
        </form>

        {errors.length > 0 && !done && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/40">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-rose-400">{err}</p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
