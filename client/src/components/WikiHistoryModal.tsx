import React, { useEffect, useMemo, useState } from "react";
import { WikiPage, WikiVersion } from "@/types/lekki";
import { wiki } from "@/lib/api";
import { toast } from "sonner";
import {
  History,
  X,
  RotateCcw,
  Clock3,
  UserRound,
  Search,
  FileText,
  ChevronRight,
  GitBranch,
  Check,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";

interface WikiHistoryModalProps {
  page: WikiPage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVersionRestored: (updatedPage: WikiPage) => void;
}

const formatDate = (value?: string, withTime = false) => {
  if (!value) return "Date inconnue";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date inconnue";

  return new Intl.DateTimeFormat(
    "fr-FR",
    withTime
      ? {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
  ).format(date);
};

const getVersionDate = (version: WikiVersion) =>
  version.created_at || version.updated_at;

const getPageVersions = (page: WikiPage): WikiVersion[] => {
  const versions = page.versions?.length ? page.versions : page.history || [];
  return [...versions].sort((a, b) => b.version - a.version);
};

const getCurrentVersionNumber = (page: WikiPage) =>
  page.current_version ?? Math.max(0, ...getPageVersions(page).map((version) => version.version));

export function WikiHistoryModal({
  page,
  open,
  onOpenChange,
  onVersionRestored,
}: WikiHistoryModalProps) {
  const [selectedVersion, setSelectedVersion] =
    useState<WikiVersion | null>(null);

  const [restoring, setRestoring] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!open || !page) return;

    const versions = getPageVersions(page);

    const currentVersion = versions.find(
      (version) => version.version === getCurrentVersionNumber(page)
    );
    const latestVersion = versions[0];

    setSelectedVersion(currentVersion || latestVersion || null);
    setSearchQuery("");
  }, [open, page]);

  const versions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return (page ? getPageVersions(page) : [])
      .filter((version) => {
        if (!query) return true;

        return (
          String(version.version).includes(query) ||
          (version.author_name || "").toLowerCase().includes(query) ||
          (version.comment || "").toLowerCase().includes(query) ||
          formatDate(getVersionDate(version))
            .toLowerCase()
            .includes(query)
        );
      });
  }, [page?.history, page?.versions, searchQuery]);

  if (!open || !page) return null;

  const isCurrentVersion = (version: WikiVersion) =>
    version.version === getCurrentVersionNumber(page);

  const handleRestore = async (version: WikiVersion) => {
    if (restoring || isCurrentVersion(version)) return;

    const confirmed = window.confirm(
      `Restaurer la version v${version.version} de « ${page.title} » ?\n\n` +
        "Le contenu de cette ancienne version remplacera le contenu actuel. " +
        "Cette opération peut créer une nouvelle révision dans l'historique."
    );

    if (!confirmed) return;

    setRestoring(true);

    try {
      const updated = await wiki.restoreVersion(
        page.id,
        version.version
      );

      toast.success(`Version v${version.version} restaurée avec succès`);

      onVersionRestored(updated);
      onOpenChange(false);
    } catch {
      toast.error("Impossible de restaurer cette version");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div
      id="wiki-history-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-0 text-heading backdrop-blur-sm lg:bottom-0 lg:left-64 lg:right-0 lg:top-16"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !restoring) {
          onOpenChange(false);
        }
      }}
    >
      <div
        id="wiki-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wiki-history-title"
        className="flex h-full w-full flex-col overflow-hidden bg-[#F4F3ED] sm:rounded-2xl sm:border sm:border-[#E7E4D9] sm:shadow-2xl lg:rounded-none lg:border-0"
      >
        {/* HEADER */}
        <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-[#E7E4D9] bg-white px-4 sm:px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.07]">
            <History className="h-[17px] w-[17px] text-emerald-400" />
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="wiki-history-title"
              className="text-sm font-semibold text-heading"
            >
              Historique des versions
            </h2>

            <p className="mt-0.5 truncate text-[11px] text-subtle">
              {page.title}
              <span className="mx-1.5 text-subtle">/</span>
              {getPageVersions(page).length} révisions
            </p>
          </div>

          <button
            type="button"
            onClick={() => !restoring && onOpenChange(false)}
            disabled={restoring}
            aria-label="Fermer l'historique"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-subtle transition hover:bg-[#F8F7F2] hover:text-[#16241D] disabled:opacity-40"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </header>

        {/* MAIN LAYOUT */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* VERSION TIMELINE */}
          <aside className="flex max-h-[38%] w-full shrink-0 flex-col border-b border-[#E7E4D9] bg-white lg:max-h-none lg:w-[310px] lg:border-b-0 lg:border-r xl:w-[340px]">
            {/* Search */}
            <div className="shrink-0 px-4 pb-3 pt-4 sm:px-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />

                <input
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="Rechercher une révision..."
                  aria-label="Rechercher une révision"
                  className="w-full rounded-lg border border-[#E7E4D9] bg-[#F4F3ED] py-2.5 pl-9 pr-3 text-xs text-strong outline-none transition-colors placeholder:text-faint focus:border-emerald-500/40"
                />
              </div>
            </div>

            {/* Timeline header */}
            <div className="flex shrink-0 items-center justify-between px-5 pb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                Chronologie
              </span>

              <span className="rounded-md bg-[#F8F7F2] px-2 py-1 font-mono text-[10px] text-muted">
                {versions.length}
              </span>
            </div>

            {/* Version list */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {versions.length > 0 ? (
                <div className="relative space-y-1">
                  {versions.map((version, index) => {
                    const selected =
                      selectedVersion?.version === version.version;

                    const current = isCurrentVersion(version);

                    return (
                      <button
                        key={version.version}
                        type="button"
                        onClick={() => setSelectedVersion(version)}
                        aria-pressed={selected}
                        className={`group relative flex w-full gap-3 rounded-xl border p-3 text-left transition-colors ${
                          selected
                            ? "border-emerald-400/25 bg-emerald-400/[0.07]"
                            : "border-transparent hover:bg-[#F8F7F2]"
                        }`}
                      >
                        {/* Timeline indicator */}
                        <div className="relative flex w-5 shrink-0 justify-center pt-0.5">
                          {index < versions.length - 1 && (
                            <div className="absolute bottom-[-24px] top-5 w-px bg-[#F8F7F2]" />
                          )}

                          <div
                            className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border ${
                              selected
                                ? "border-emerald-400/50 bg-emerald-400/15"
                                : current
                                  ? "border-emerald-400/30 bg-emerald-400/[0.07]"
                                  : "border-[#E7E4D9] bg-white"
                            }`}
                          >
                            {current ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  selected
                                    ? "bg-emerald-400"
                                    : "bg-[#CFCBBB]"
                                }`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Version details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`font-mono text-xs font-semibold ${
                                selected
                                  ? "text-emerald-300"
                                  : "text-strong"
                              }`}
                            >
                              v{version.version}
                            </span>

                            {current && (
                              <span className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
                                Actuelle
                              </span>
                            )}
                          </div>

                          <p className="mt-2 line-clamp-2 break-words text-xs leading-relaxed text-body">
                            {version.comment ||
                              "Modification du contenu"}
                          </p>

                          <div className="mt-2.5 flex min-w-0 items-center gap-2 text-[10px] text-subtle">
                            <UserRound className="h-3 w-3 shrink-0" />

                            <span className="min-w-0 truncate">
                              {version.author_name || "Auteur inconnu"}
                            </span>

                            <span className="shrink-0 text-subtle">
                              ·
                            </span>

                            <span className="shrink-0">
                              {formatDate(getVersionDate(version))}
                            </span>
                          </div>
                        </div>

                        {selected && (
                          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center px-5 py-10 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F7F2]">
                    <History className="h-5 w-5 text-faint" />
                  </div>

                  <p className="text-xs font-medium text-muted">
                    Aucune révision trouvée
                  </p>

                  <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
                    Essaie un autre mot.
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar footer */}
            <div className="hidden shrink-0 border-t border-[#E7E4D9] px-5 py-3 lg:block">
              <p className="text-[10px] text-faint">
                Choisis une version pour voir son contenu.
              </p>
            </div>
          </aside>

          {/* VERSION CONTENT */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#F4F3ED]">
            {selectedVersion ? (
              <>
                {/* Preview header */}
                <div className="flex shrink-0 flex-col gap-4 border-b border-[#E7E4D9] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F8F7F2]">
                        <FileText className="h-3.5 w-3.5 text-muted" />
                      </div>

                      <h3 className="text-sm font-semibold text-heading">
                        Version v{selectedVersion.version}
                      </h3>

                      {isCurrentVersion(selectedVersion) && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/15 bg-emerald-400/[0.07] px-2 py-1 text-[10px] font-medium text-emerald-300">
                          <Check className="h-3 w-3" />
                          Version actuelle
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-subtle">
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="h-3 w-3" />
                        {selectedVersion.author_name || "Auteur inconnu"}
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3 w-3" />
                        {formatDate(
                          getVersionDate(selectedVersion),
                          true
                        )}
                      </span>
                    </div>
                  </div>

                  {!isCurrentVersion(selectedVersion) && (
                    <button
                      type="button"
                      onClick={() => handleRestore(selectedVersion)}
                      disabled={restoring}
                      className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3.5 py-2.5 text-xs font-semibold text-[#F1F0E9] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw
                        className={`h-3.5 w-3.5 ${
                          restoring ? "animate-spin" : ""
                        }`}
                      />

                      {restoring
                        ? "Restauration..."
                        : "Restaurer cette version"}
                    </button>
                  )}
                </div>

                {/* Version metadata */}
                <div className="flex shrink-0 items-start gap-3 border-b border-[#E7E4D9] px-5 py-3 sm:px-7">
                  <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />

                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
                      Commentaire de révision
                    </p>

                    <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                      {selectedVersion.comment ||
                        "Aucun commentaire pour cette révision."}
                    </p>
                  </div>
                </div>

                {/* Document body */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="mx-auto w-full max-w-[900px] px-5 py-7 sm:px-8 sm:py-10">
                    <div className="mb-8 border-b border-[#E7E4D9] pb-5">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
                        Aperçu du document
                      </p>

                      <h1 className="break-words text-xl font-semibold tracking-tight text-heading sm:text-2xl">
                        {page.title}
                      </h1>
                    </div>

                    <article className="whitespace-pre-wrap break-words font-mono text-[12px] leading-7 text-body sm:text-[13px]">
                      {selectedVersion.content || (
                        <span className="italic text-faint">
                          Cette version ne contient aucun texte.
                        </span>
                      )}
                    </article>

                    <div className="mt-10 flex items-start gap-3 rounded-xl border border-[#E7E4D9] bg-[#F8F7F2] p-4">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-faint" />

                      <p className="text-[11px] leading-relaxed text-subtle">
                        Tu consultes une version historique en lecture
                        seule. Son contenu ne sera modifié que si tu
                        décides de la restaurer.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom status */}
                <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#E7E4D9] bg-white px-5 py-3 sm:px-7">
                  <span className="text-[10px] text-faint">
                    {isCurrentVersion(selectedVersion)
                      ? "Tu consultes la dernière version enregistrée."
                      : `Révision historique · v${selectedVersion.version}`}
                  </span>

                  {!isCurrentVersion(selectedVersion) && (
                    <span className="text-[10px] text-subtle">
                      Lecture seule
                    </span>
                  )}
                </footer>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E7E4D9] bg-[#F8F7F2]">
                  <History className="h-6 w-6 text-faint" />
                </div>

                <h3 className="text-sm font-medium text-body">
                  Aucun historique disponible
                </h3>

                <p className="mt-2 max-w-xs text-xs leading-relaxed text-faint">
                  Les révisions enregistrées apparaîtront ici et pourront
                  être consultées individuellement.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}