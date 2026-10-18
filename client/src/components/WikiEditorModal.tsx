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
  defaultParentPageId?: string | null;
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
  "w-full rounded-lg border border-white/[0.09] bg-[#11151b] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-sky-500/60";

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
  defaultParentPageId,
  initialKind = "page",
  onSaved,
}: WikiEditorModalProps) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("Réseaux");
  const [customTopic, setCustomTopic] = useState("");
  const [section, setSection] = useState("Fondamentaux");
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectedWikiIds, setSelectedWikiIds] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOrganization, setShowOrganization] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [parentPageId, setParentPageId] = useState("");
  const [activeSourceTab, setActiveSourceTab] = useState<
    "documents" | "pages"
  >("documents");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!open) return;

    if (page) {
      setTitle(page.title);

      const pageTopic = page.topic || "Réseaux";

      if (COMMON_TOPICS.includes(pageTopic)) {
        setTopic(pageTopic);
        setCustomTopic("");
      } else {
        setTopic("Autre");
        setCustomTopic(pageTopic);
      }

      setSection(page.section || "Général");
      setContent(page.content || "");
      setComment("");
      setSelectedDocIds(page.related_document_ids || []);
      setSelectedWikiIds(page.related_wiki_ids || []);
      setParentPageId(page.parent_page_id || "");
    } else {
      setTitle("");

      const initTopic =
        initialKind === "organization" && !defaultTopic
          ? "Autre"
          : defaultTopic || "Réseaux";

      if (COMMON_TOPICS.includes(initTopic)) {
        setTopic(initTopic);
        setCustomTopic("");
      } else {
        setTopic("Autre");
        setCustomTopic(initTopic === "Autre" ? "" : initTopic);
      }

      setSection(defaultSection || "Fondamentaux");

      setContent(
        initialKind === "organization"
          ? "# Présentation\n\nPrésentez ce domaine et expliquez comment les connaissances y sont organisées.\n\n## Explorer ce domaine\n\nAjoutez des sous-pages pour détailler les notions, les procédures et les ressources utiles."
          : "# Vue d'ensemble\n\nPrésentez le sujet et expliquez les notions essentielles.\n\n## Points essentiels\n\n- Premier principe\n- Deuxième principe\n\n## Exemple concret\n\nAjoutez un exemple, une configuration ou une commande utile."
      );

      setComment("Création initiale de la page");
      setSelectedDocIds([]);
      setSelectedWikiIds([]);
      setParentPageId(defaultParentPageId || "");
    }

    setPreviewMode(false);
    setShowOrganization(Boolean(page));
    setLinkSearch("");
    setActiveSourceTab("documents");
  }, [
    open,
    page,
    defaultTopic,
    defaultSection,
    defaultParentPageId,
    initialKind,
  ]);

  const finalTopic =
    topic === "Autre"
      ? customTopic.trim() ||
        (initialKind === "organization" ? title.trim() : "Général")
      : topic;

  /**
   * Recherche les descendants de la page actuelle.
   * Ils ne doivent pas pouvoir devenir ses parents.
   */
  const forbiddenParentIds = useMemo(() => {
    const forbidden = new Set<string>();

    if (!page) return forbidden;

    forbidden.add(page.id);

    let changed = true;

    while (changed) {
      changed = false;

      for (const candidate of allWikiPages) {
        if (
          candidate.parent_page_id &&
          forbidden.has(candidate.parent_page_id) &&
          !forbidden.has(candidate.id)
        ) {
          forbidden.add(candidate.id);
          changed = true;
        }
      }
    }

    return forbidden;
  }, [allWikiPages, page]);

  const availableParents = allWikiPages.filter(
    (candidate) => !forbiddenParentIds.has(candidate.id)
  );

  const potentialLinkedWikis = allWikiPages.filter(
    (candidate) => candidate.id !== page?.id
  );

  const normalizedSearch = linkSearch.trim().toLowerCase();

  const filteredFiles = availableFiles
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

    if (parentPageId && forbiddenParentIds.has(parentPageId)) {
      toast.error("Cette page ne peut pas être utilisée comme parent");
      return;
    }

    setSaving(true);

    try {
      let result: WikiPage;

      const payload = {
        title: title.trim(),
        topic: finalTopic,
        section: section.trim() || "Général",
        content,
        parent_page_id: parentPageId || null,
        related_document_ids: selectedDocIds,
        related_wiki_ids: selectedWikiIds,
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
      <header className="relative z-20 flex h-[68px] shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#101319] px-4 sm:px-6">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Fermer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-[18px] w-[18px]" />
        </button>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/15 bg-sky-400/[0.08]">
          <BookOpen className="h-[17px] w-[17px] text-sky-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600 sm:block">
            Lekki / Wiki
          </div>

          <input
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titre de votre page..."
            className="w-full min-w-0 bg-transparent text-sm font-semibold text-zinc-100 outline-none placeholder:text-zinc-600 sm:text-base"
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
          type="submit"
          form="wiki-editor-form"
          disabled={saving || !title.trim()}
          className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-sky-400 px-3.5 text-xs font-semibold text-[#081018] transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
        >
          <Save className="h-3.5 w-3.5" />
          <span>
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
          <div className="mx-auto max-w-[1040px] px-5 py-6 sm:px-8 sm:py-8 xl:px-12">
            {/* ORGANISATION */}
            <section className="mb-8">
              <button
                type="button"
                onClick={() =>
                  setShowOrganization((previous) => !previous)
                }
                aria-expanded={showOrganization}
                className="group flex w-full items-center gap-3 text-left"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
                  <FolderTree className="h-4 w-4 text-zinc-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-200">
                    Organisation
                  </p>

                  <p className="mt-1 truncate text-[11px] text-zinc-500">
                    {finalTopic || "Sans pôle"} /{" "}
                    {section || "Sans section"}
                    {parentPageId
                      ? ` · Sous-page de ${
                          allWikiPages.find(
                            (candidate) => candidate.id === parentPageId
                          )?.title || "Page parente"
                        }`
                      : " · Racine du Wiki"}
                  </p>
                </div>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                    showOrganization ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showOrganization && (
                <div className="mt-4 grid gap-4 rounded-xl border border-white/[0.07] bg-[#101319] p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Emplacement dans le Wiki
                    </label>

                    <select
                      value={parentPageId}
                      onChange={(event) =>
                        setParentPageId(event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">Racine du Wiki</option>

                      {availableParents.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.title}
                          {candidate.topic ? ` · ${candidate.topic}` : ""}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                      Choisissez une page pour créer une sous-page, ou
                      laissez la racine pour créer une entrée principale.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Pôle thématique</label>

                    <select
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      className={inputClass}
                    >
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

              <div className="flex items-center gap-1 rounded-lg border border-white/[0.07] bg-[#11151b] p-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  aria-pressed={!previewMode}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
                    !previewMode
                      ? "bg-white/[0.09] text-zinc-100"
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
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
                    previewMode
                      ? "bg-white/[0.09] text-zinc-100"
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
              <div className="min-h-[55vh] rounded-lg border border-white/[0.07] bg-[#101319] px-5 py-6 sm:px-8 sm:py-8">
                <h1 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-100">
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
                className="min-h-[55vh] w-full resize-y rounded-lg border border-white/[0.07] bg-[#101319] p-5 font-mono text-[13px] leading-7 text-zinc-300 outline-none transition-colors placeholder:text-zinc-700 focus:border-sky-500/40 sm:p-7"
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
        {sidebarOpen && (
          <aside className="flex max-h-[40vh] w-full shrink-0 flex-col border-t border-white/[0.07] bg-[#101319] lg:max-h-none lg:w-[310px] lg:border-l lg:border-t-0 xl:w-[350px]">
            {/* SIDEBAR HEADER */}
            <div className="shrink-0 px-5 pb-4 pt-5">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-sky-400" />

                <h2 className="text-xs font-semibold text-zinc-200">
                  Sources et relations
                </h2>

                <span className="ml-auto rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-zinc-400">
                  {selectedDocIds.length + selectedWikiIds.length}
                </span>
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
                <div className="flex flex-col gap-1.5">
                  {selectedDocIds.map((id) => {
                    const file = availableFiles.find(
                      (item) => item.id === id
                    );

                    if (!file) return null;

                    return (
                      <div
                        key={`doc-${id}`}
                        className="flex min-w-0 items-center gap-2 rounded-lg border border-sky-400/10 bg-sky-400/[0.04] px-2.5 py-2"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-sky-400" />

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
                  className="w-full rounded-lg border border-white/[0.07] bg-[#0c0f14] py-2.5 pl-9 pr-3 text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-sky-500/40"
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
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/[0.07]">
                            <FileText className="h-4 w-4 text-sky-400" />
                          </div>

                          <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                            {file.name}
                          </span>

                          <Plus className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:text-sky-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <FileText className="mx-auto mb-3 h-5 w-5 text-zinc-700" />

                      <p className="text-xs text-zinc-500">
                        {normalizedSearch
                          ? "Aucun document trouvé"
                          : availableFiles.length === 0
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

                          <Plus className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:text-sky-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <BookOpen className="mx-auto mb-3 h-5 w-5 text-zinc-700" />

                      <p className="text-xs text-zinc-500">
                        {normalizedSearch
                          ? "Aucune page trouvée"
                          : allWikiPages.length === 0
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
        )}
      </form>
    </div>
  );
}