import React, { useMemo, useState } from "react";
import { WikiPage, WikiVersion } from "@/types/lekki";
import { wiki } from "@/lib/api";
import { toast } from "sonner";
import { History, X, RotateCcw, Clock, User, Search, FileText } from "lucide-react";

interface WikiHistoryModalProps {
  page: WikiPage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVersionRestored: (updatedPage: WikiPage) => void;
}

export function WikiHistoryModal({
  page,
  open,
  onOpenChange,
  onVersionRestored,
}: WikiHistoryModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<WikiVersion | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    if (page && page.versions?.length) {
      setSelectedVersion(page.versions[page.versions.length - 1]);
    } else {
      setSelectedVersion(null);
    }
    setSearchQuery("");
  }, [page]);

  const versions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...(page?.versions || [])]
      .reverse()
      .filter((version) =>
        !query ||
        String(version.version).includes(query) ||
        version.author_name.toLowerCase().includes(query) ||
        (version.comment || "").toLowerCase().includes(query)
      );
  }, [page?.versions, searchQuery]);

  if (!open || !page) return null;

  const handleRestore = async (versionNum: number) => {
    setRestoring(true);
    try {
      const updated = await wiki.restoreVersion(page.id, versionNum);
      toast.success(`Version v${versionNum} restaurée avec succès`);
      onVersionRestored(updated);
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la restauration de la version");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div
      id="wiki-history-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        id="wiki-history-modal"
        className="w-full max-w-5xl h-[min(82vh,760px)] bg-[#161A22] border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-[#151922]">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Historique des versions
              </h2>
              <p className="text-[11px] text-zinc-400 truncate max-w-[min(60vw,520px)]">
                {page.title} · {page.versions?.length || 0} révisions
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Layout: Left = Versions List, Right = Content preview */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Versions Sidebar */}
          <div className="w-72 border-r border-zinc-800 bg-[#12151B] overflow-y-auto p-3 space-y-2 shrink-0">
            <div className="relative mb-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher une révision..."
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 pl-8 pr-2.5 py-1.5 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="px-1 py-1 text-[10px] font-mono uppercase text-zinc-500 font-semibold">
              Révisions ({versions.length})
            </div>
            {versions.map((ver) => {
              const isSelected = selectedVersion?.version === ver.version;
              const isCurrent = ver.version === page.current_version;
              return (
                <button
                  key={ver.version}
                  onClick={() => setSelectedVersion(ver)}
                  className={`w-full p-2.5 rounded-lg text-left transition-colors text-xs border ${
                    isSelected
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                      : "bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-emerald-400">
                      v{ver.version}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans">
                        Actuelle
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-300 mt-1 truncate">
                    {ver.comment || "Modification du contenu"}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1.5 font-mono">
                    <span className="flex items-center gap-0.5 truncate">
                      <User className="h-2.5 w-2.5" />
                      {ver.author_name}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(ver.created_at || ver.updated_at || Date.now()).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </button>
              );
            })}
            {versions.length === 0 && (
              <div className="px-2 py-8 text-center text-[11px] text-zinc-500">
                Aucune révision correspondante.
              </div>
            )}
          </div>

          {/* Version Preview Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0E1116] overflow-hidden">
            {selectedVersion ? (
              <>
                <div className="px-5 py-4 border-b border-zinc-800 bg-[#14171E] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 truncate font-mono">
                      <FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>Aperçu de la version v{selectedVersion.version}</span>
                      {selectedVersion.version === page.current_version && (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] text-emerald-300 font-sans">Version actuelle</span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      {selectedVersion.author_name} · {new Date(selectedVersion.created_at || selectedVersion.updated_at || Date.now()).toLocaleString("fr-FR")} · {selectedVersion.comment || "Modification du contenu"}
                    </div>
                  </div>

                  {selectedVersion.version !== page.current_version && (
                    <button
                      onClick={() => handleRestore(selectedVersion.version)}
                      disabled={restoring}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors disabled:opacity-50 shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>{restoring ? "Restauration..." : "Restaurer cette version"}</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 font-mono text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {selectedVersion.content}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-xs text-zinc-500">
                <History className="h-8 w-8 text-zinc-700" />
                <span>Sélectionnez une version dans la liste</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
