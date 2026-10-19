import React, { useEffect, useMemo, useState } from "react";
import { WikiPage, DriveFile } from "@/types/lekki";
import { wiki } from "@/lib/api";
import { toast } from "sonner";
import { MarkdownContent } from "./MarkdownContent";
import {
  X,
  BookOpen,
  FileText,
  Save,
  Eye,
  Edit3,
  Link2,
  FolderTree,
  ChevronDown,
  Search,
  Plus,
  Trash2,
  ArrowUpRight,
  PanelRightClose,
  PanelRightOpen,
  CornerDownRight,
  LoaderCircle,
} from "lucide-react";

interface WikiEditorModalProps {
  page: WikiPage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableFiles: DriveFile[];
  allWikiPages?: WikiPage[];
  activeWorkspaceId: string | null;
  defaultTopic?: string;
  defaultSection?: string;
  initialKind?: "page" | "organization";
  onSaved: (savedPage: WikiPage) => void;
}

const COMMON_TOPICS = [
  "Réseaux",
  "Télécoms",
  "Cybersécurité",
  "Informatique",
];

const inputClass =
  "w-full rounded-lg border border-white/[0.09] bg-[#11151b] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10";

const labelClass =
  "mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500";

export function WikiEditorModal({
  page,
  open,
  onOpenChange,
  availableFiles,
  allWikiPages = [],
  activeWorkspaceId,
  defaultTopic,
  defaultSection,
  initialKind = "page",
  onSaved,
}: WikiEditorModalProps) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("Réseaux");
  const [customTopic, setCustomTopic] = useState("");
  const [section, setSection] = useState("");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectedWikiIds, setSelectedWikiIds] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOrganization, setShowOrganization] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [activeSourceTab, setActiveSourceTab] = useState<
    "documents" | "pages"
  >("documents");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSourcesOpen, setMobileSourcesOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    setMobileSourcesOpen(false);

    if (page) {
      setTitle(page.title);

      const pageTopic = page.topic || "";

      if (!pageTopic || pageTopic === "Général") {
        setTopic("");
        setCustomTopic("");
      } else if (COMMON_TOPICS.includes(pageTopic)) {
        setTopic(pageTopic);
        setCustomTopic("");
      } else {
        setTopic("Autre");
        setCustomTopic(pageTopic);
      }

      setSection(page.section === "Général" ? "" : page.section || "");
      setContent(page.content || "");
      setComment("");
      setSelectedDocIds(page.related_document_ids || []);
      setSelectedWikiIds(page.related_wiki_ids || []);
    } else {
      setTitle("");

      const initTopic = defaultTopic || "";

      if (COMMON_TOPICS.includes(initTopic)) {
        setTopic(initTopic);
        setCustomTopic("");
      } else {
        setTopic("Autre");
        setCustomTopic(initTopic === "Autre" ? "" : initTopic);
      }

      setSection(defaultSection || "");

      setContent(
        initialKind === "organization"
          ? "# Présentation\n\nPrésentez ce domaine et expliquez les connaissances qui lui sont liées.\n\n## Notions principales\n\nAjoutez les notions utiles puis reliez-les aux autres pages et documents dans les sources."
          : "# Vue d'ensemble\n\nPrésentez le sujet et expliquez les notions essentielles.\n\n## Points essentiels\n\n- Premier principe\n- Deuxième principe\n\n## Exemple concret\n\nAjoutez un exemple, une configuration ou une commande utile."
      );

      setComment("Création initiale de la page");
      setSelectedDocIds([]);
      setSelectedWikiIds([]);
    }

    setPreviewMode(false);
    setShowOrganization(false);
    setLinkSearch("");
    setActiveSourceTab("documents");
  }, [
    open,
    page,
    defaultTopic,
    defaultSection,
    initialKind,
  ]);

  const finalTopic =
    topic === "Autre" ? customTopic.trim() : topic.trim();

  const workspaceFiles = availableFiles.filter(
    (file) => Boolean(activeWorkspaceId) && file.workspace_id === activeWorkspaceId
  );
  const potentialLinkedWikis = allWikiPages.filter(
    (candidate) =>
      Boolean(activeWorkspaceId) &&
      candidate.workspace_id === activeWorkspaceId &&
      candidate.id !== page?.id
  );

  const normalizedSearch = linkSearch.trim().toLowerCase();

  const filteredFiles = workspaceFiles
    .filter((file) => !selectedDocIds.includes(file.id))
    .filter(
      (file) =>
        !normalizedSearch ||
        file.name.toLowerCase().includes(normalizedSearch)
    )
    .slice(0, 8);

  const filteredLinkedWikis = potentialLinkedWikis
    .filter((candidate) => !selectedWikiIds.includes(candidate.id))
    .filter(
      (candidate) =>
        !normalizedSearch ||
        candidate.title.toLowerCase().includes(normalizedSearch)
    )
    .slice(0, 8);

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((previous) =>
      previous.includes(docId)
        ? previous.filter((id) => id !== docId)
        : [...previous, docId]
    );
  };

  const toggleWikiPage = (wikiId: string) => {
    setSelectedWikiIds((previous) =>
      previous.includes(wikiId)
        ? previous.filter((id) => id !== wikiId)
        : [...previous, wikiId]
    );
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("Veuillez saisir un titre pour la page");
      return;
    }

    setSaving(true);

    try {
      let result: WikiPage;

      const payload = {
        title: title.trim(),
        topic: finalTopic || "Général",
        section: section.trim() || "Général",
        content,
        parent_page_id: null,
        related_document_ids: selectedDocIds.filter((id) =>
          workspaceFiles.some((file) => file.id === id)
        ),
        related_wiki_ids: selectedWikiIds.filter((id) =>
          potentialLinkedWikis.some((candidate) => candidate.id === id)
        ),
      };

      if (page) {
        result = await wiki.updatePage(page.id, {
          ...payload,
          comment: comment.trim() || "Mise à jour du contenu",
        });

        toast.success(`« ${result.title} » a été mis à jour`);
      } else {
        result = await wiki.createPage({
          ...payload,
          workspace_id: activeWorkspaceId || undefined,
        });

        toast.success(`« ${result.title} » a été ajouté au Wiki`);
      }

      onSaved(result);
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'enregistrement de la page");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      id="wiki-editor-modal"
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0c0f14] text-zinc-100"
    >
      {/* HEADER */}
      <header className="relative z-20 flex min-h-[68px] shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-white/[0.07] bg-[#101319] px-3 py-2 sm:h-[68px] sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Fermer"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-[18px] w-[18px]" />
        </button>

        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.08] sm:flex">
          <BookOpen className="h-[17px] w-[17px] text-emerald-400" />
        </div>

        <div className="order-3 w-full min-w-0 border-t border-white/[0.06] pt-2 sm:order-none sm:w-auto sm:flex-1 sm:border-0 sm:pt-0">
          <div className="mb-0.5 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600 sm:block">
            Lekki / Wiki
          </div>

          <input
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titre de votre page..."
            className="w-full min-w-0 bg-transparent text-base font-semibold text-zinc-100 outline-none placeholder:text-zinc-600 sm:text-base"
          />
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-[11px] text-zinc-600">
            {page ? "Modification" : "Nouvelle page"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSidebarOpen((previous) => !previous)}
          title={sidebarOpen ? "Masquer les sources" : "Afficher les sources"}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200 lg:flex"
        >
          {sidebarOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileSourcesOpen(true)}
          aria-label={`Ouvrir les sources et relations (${selectedDocIds.length + selectedWikiIds.length} associées)`}
          className="order-2 inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.07] lg:hidden"
        >
          <Link2 className="h-4 w-4 text-emerald-400" />
          <span>Sources</span>
          {(selectedDocIds.length + selectedWikiIds.length) > 0 && (
            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              {selectedDocIds.length + selectedWikiIds.length}
            </span>
          )}
        </button>

        <button
          type="submit"
          form="wiki-editor-form"
          disabled={saving || !title.trim()}
          aria-label={saving ? "Publication en cours" : page ? "Enregistrer la page" : "Publier la page"}
          className="order-2 flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-[#081018] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 sm:order-none sm:h-9 sm:rounded-lg sm:px-4"
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">
            {saving
              ? "Publication..."
              : page
                ? "Enregistrer"
                : "Publier"}
          </span>
        </button>
      </header>

      <form
        id="wiki-editor-form"
        onSubmit={handleSave}
        className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
      >
        {/* MAIN EDITOR */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1040px] px-4 py-5 sm:px-8 sm:py-8 xl:px-12">
            {/* ORGANISATION */}
            <section className="mb-8">
              <button
                type="button"
                onClick={() =>
                  setShowOrganization((previous) => !previous)
                }
                aria-expanded={showOrganization}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#101319] p-3.5 text-left transition hover:border-emerald-500/20 hover:bg-[#12171b] sm:p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/[0.07]">
                  <FolderTree className="h-4 w-4 text-emerald-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-200">
                    Organisation
                  </p>

                  <p className={`mt-1 truncate text-[11px] ${finalTopic && section ? "text-zinc-500" : "text-amber-400/80"}`}>
                    {finalTopic || "Pôle à choisir"} · {section || "Section à choisir"}
                  </p>
                </div>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                    showOrganization ? "rotate-180 text-emerald-400" : ""
                  }`}
                />
              </button>

              {showOrganization && (
                <div className="mt-3 grid gap-4 rounded-2xl border border-white/[0.07] bg-[#101319] p-3.5 sm:grid-cols-2 sm:p-4">
                  <div>
                    <label className={labelClass}>Pôle thématique</label>

                    <select
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Choisir un pôle</option>
                      {COMMON_TOPICS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                      <option value="Autre">Autre</option>
                    </select>

                    {topic === "Autre" && (
                      <input
                        value={customTopic}
                        onChange={(event) =>
                          setCustomTopic(event.target.value)
                        }
                        placeholder="Nom du pôle"
                        className={`${inputClass} mt-2`}
                      />
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Section</label>

                    <input
                      value={section}
                      onChange={(event) => setSection(event.target.value)}
                      placeholder="Ex. : Routage, Fondamentaux..."
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* EDITOR TOOLBAR */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
              <div>
                <h2 className="text-xs font-semibold text-zinc-200">
                  Contenu
                </h2>
                <p className="mt-1 text-[11px] text-zinc-600">
                  Rédigez et structurez vos connaissances.
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-[#11151b] p-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  aria-pressed={!previewMode}
                  className={`flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                    !previewMode
                      ? "bg-emerald-500/15 text-emerald-300 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Edit3 className="h-3 w-3" />
                  Éditeur
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  aria-pressed={previewMode}
                  className={`flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                    previewMode
                      ? "bg-emerald-500/15 text-emerald-300 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  Aperçu
                </button>
              </div>
            </div>

            {/* EDITING AREA */}
            {previewMode ? (
              <div className="rounded-2xl border border-white/[0.07] bg-[#101319] px-3 py-4 sm:min-h-[55vh] sm:rounded-xl sm:px-8 sm:py-8">
                <h1 className="mb-4 text-xl font-semibold tracking-tight text-zinc-100 sm:mb-8 sm:text-2xl">
                  {title || "Sans titre"}
                </h1>

                {content ? (
                  <MarkdownContent content={content} className="text-sm leading-7" />
                ) : (
                  <div className="text-sm italic text-zinc-600">
                    <span className="italic text-zinc-600">
                      Aucun contenu pour le moment.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={
                  "# Vue d'ensemble\n\nPrésentez le sujet...\n\n## 1. Principes fondamentaux\n\nExpliquez les concepts essentiels.\n\n## 2. Exemple pratique\n\nAjoutez une configuration, une commande ou un cas concret."
                }
                spellCheck
                className="min-h-[45dvh] w-full resize-y rounded-2xl border border-white/[0.07] bg-[#101319] p-4 font-mono text-[13px] leading-7 text-zinc-300 outline-none transition-colors placeholder:text-zinc-700 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10 sm:min-h-[55vh] sm:rounded-xl sm:p-7"
              />
            )}

            {/* EDIT HISTORY */}
            {page && (
              <section className="mt-8 border-t border-white/[0.07] pt-5">
                <label className={labelClass}>
                  Commentaire de modification
                  <span className="ml-2 normal-case tracking-normal text-zinc-700">
                    Facultatif
                  </span>
                </label>

                <input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Qu'avez-vous modifié ?"
                  className={inputClass}
                />
              </section>
            )}

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-4">
              <span className="text-[10px] text-zinc-600">
                Markdown pris en charge
              </span>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-xs text-zinc-500 transition hover:text-zinc-200"
              >
                Annuler
              </button>
            </div>
          </div>
        </main>

        {/* SOURCES SIDEBAR */}
        {(sidebarOpen || mobileSourcesOpen) && (
          <>
            {mobileSourcesOpen && (
              <button
                type="button"
                aria-label="Fermer le panneau des sources"
                onClick={() => setMobileSourcesOpen(false)}
                className="fixed inset-0 z-30 bg-black/65 backdrop-blur-sm lg:hidden"
              />
            )}
            <aside
              className={`${mobileSourcesOpen ? "fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] animate-in slide-in-from-bottom duration-200 rounded-t-3xl border-x border-t shadow-2xl" : "hidden"} w-full shrink-0 flex-col border-white/[0.07] bg-[#101319] lg:static lg:z-auto lg:max-h-none lg:w-[310px] lg:animate-none lg:rounded-none lg:border-x-0 lg:border-y-0 lg:border-l lg:shadow-none xl:w-[350px] ${sidebarOpen ? "lg:flex" : "lg:hidden"}`}
            >
            {/* SIDEBAR HEADER */}
            <div className="shrink-0 px-5 pb-4 pt-2 lg:pt-5">
              <div className="mx-auto mb-3 mt-1 h-1 w-10 rounded-full bg-white/15 lg:hidden" />
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-emerald-400" />

                <h2 className="text-xs font-semibold text-zinc-200">
                  Sources et relations
                </h2>

                <span className="ml-auto rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-zinc-400">
                  {selectedDocIds.length + selectedWikiIds.length}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSourcesOpen(false)}
                  aria-label="Fermer les sources"
                  className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                Reliez cette page aux documents et connaissances utiles.
              </p>
            </div>

            {/* SELECTED SOURCES */}
            <div className="shrink-0 px-5 pb-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                Éléments associés
              </p>

              {selectedDocIds.length === 0 &&
              selectedWikiIds.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/[0.09] px-3 py-4 text-center">
                  <Link2 className="mx-auto mb-2 h-4 w-4 text-zinc-600" />
                  <p className="text-[11px] text-zinc-500">
                    Aucune relation pour le moment
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    Ajoutez des sources ci-dessous.
                  </p>
                </div>
              ) : (
                <div className="flex max-h-[18dvh] flex-col gap-1.5 overflow-y-auto lg:max-h-none">
                  {selectedDocIds.map((id) => {
                    const file = availableFiles.find(
                      (item) => item.id === id
                    );

                    if (!file) return null;

                    return (
                      <div
                        key={`doc-${id}`}
                        className="flex min-w-0 items-center gap-2 rounded-lg border border-emerald-400/10 bg-emerald-400/[0.04] px-2.5 py-2"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-400" />

                        <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">
                          {file.name}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleDoc(id)}
                          aria-label={`Retirer ${file.name}`}
                          className="shrink-0 p-1 text-zinc-600 transition hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}

                  {selectedWikiIds.map((id) => {
                    const linkedPage = potentialLinkedWikis.find(
                      (item) => item.id === id
                    );

                    if (!linkedPage) return null;

                    return (
                      <div
                        key={`wiki-${id}`}
                        className="flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-2"
                      >
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

                        <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">
                          {linkedPage.title}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleWikiPage(id)}
                          aria-label={`Retirer ${linkedPage.title}`}
                          className="shrink-0 p-1 text-zinc-600 transition hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SOURCE TYPE TABS */}
            <div className="flex shrink-0 items-center gap-1 border-y border-white/[0.07] px-4 py-2">
              <button
                type="button"
                onClick={() => setActiveSourceTab("documents")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-[11px] font-medium transition ${
                  activeSourceTab === "documents"
                    ? "bg-white/[0.07] text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Documents
              </button>

              <button
                type="button"
                onClick={() => setActiveSourceTab("pages")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-[11px] font-medium transition ${
                  activeSourceTab === "pages"
                    ? "bg-white/[0.07] text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Pages Wiki
              </button>
            </div>

            {/* SEARCH */}
            <div className="shrink-0 px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />

                <input
                  value={linkSearch}
                  onChange={(event) => setLinkSearch(event.target.value)}
                  placeholder={
                    activeSourceTab === "documents"
                      ? "Rechercher un document..."
                      : "Rechercher une page..."
                  }
                  className="w-full rounded-lg border border-white/[0.07] bg-[#0c0f14] py-3 pl-9 pr-3 text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            {/* SOURCE LIST */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {activeSourceTab === "documents" ? (
                <>
                  {filteredFiles.length > 0 ? (
                    <div className="space-y-1">
                      {filteredFiles.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => toggleDoc(file.id)}
                          className="group flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-white/[0.045]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/[0.07]">
                            <FileText className="h-4 w-4 text-emerald-400" />
                          </div>

                          <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                            {file.name}
                          </span>

                          <Plus className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:text-emerald-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <FileText className="mx-auto mb-3 h-5 w-5 text-zinc-700" />

                      <p className="text-xs text-zinc-500">
                        {normalizedSearch
                          ? "Aucun document trouvé"
                            : workspaceFiles.length === 0
                            ? "Aucun document disponible"
                            : "Tous les documents correspondants sont associés"}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {filteredLinkedWikis.length > 0 ? (
                    <div className="space-y-1">
                      {filteredLinkedWikis.map((linkedPage) => (
                        <button
                          key={linkedPage.id}
                          type="button"
                          onClick={() => toggleWikiPage(linkedPage.id)}
                          className="group flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-white/[0.045]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                            <BookOpen className="h-4 w-4 text-zinc-400" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-zinc-300">
                              {linkedPage.title}
                            </p>

                            <p className="mt-1 truncate text-[10px] text-zinc-600">
                              {[linkedPage.topic, linkedPage.section]
                                .filter(Boolean)
                                .join(" · ") || "Page Wiki"}
                            </p>
                          </div>

                          <Plus className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:text-emerald-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <BookOpen className="mx-auto mb-3 h-5 w-5 text-zinc-700" />

                      <p className="text-xs text-zinc-500">
                        {normalizedSearch
                          ? "Aucune page trouvée"
                            : potentialLinkedWikis.length === 0
                            ? "Aucune autre page Wiki"
                            : "Aucune page à associer"}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* SIDEBAR FOOTER */}
            <div className="shrink-0 border-t border-white/[0.07] px-5 py-3">
              <p className="text-[10px] leading-relaxed text-zinc-600">
                Les relations facilitent la navigation entre les
                connaissances et leurs sources.
              </p>
            </div>
            </aside>
          </>
        )}
      </form>
    </div>
  );
}