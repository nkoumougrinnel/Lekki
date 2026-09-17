import React, { useState, useEffect } from "react";
import { WikiPage, DriveFile } from "@/types/lekki";
import { wiki } from "@/lib/api";
import { toast } from "sonner";
import {
  X,
  BookOpen,
  FileText,
  Save,
  Eye,
  Edit3,
  Link2,
  FolderTree,
} from "lucide-react";

interface WikiEditorModalProps {
  page: WikiPage | null; // null if creating new
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableFiles: DriveFile[];
  allWikiPages?: WikiPage[];
  activeWorkspaceId: string | null;
  defaultTopic?: string;
  defaultSection?: string;
  onSaved: (savedPage: WikiPage) => void;
}

const COMMON_TOPICS = ["Réseaux", "Télécoms", "Cybersécurité", "Informatique"];

export function WikiEditorModal({
  page,
  open,
  onOpenChange,
  availableFiles,
  allWikiPages = [],
  activeWorkspaceId,
  defaultTopic,
  defaultSection,
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

  useEffect(() => {
    if (open) {
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
        setContent(page.content);
        setComment("");
        setSelectedDocIds(page.related_document_ids || []);
        setSelectedWikiIds(page.related_wiki_ids || []);
      } else {
        setTitle("");
        const initTopic = defaultTopic || "Réseaux";
        if (COMMON_TOPICS.includes(initTopic)) {
          setTopic(initTopic);
          setCustomTopic("");
        } else {
          setTopic("Autre");
          setCustomTopic(initTopic);
        }
        setSection(defaultSection || "Fondamentaux");
        setContent(
          "# Titre de la page\n\n## 1. Vue d'ensemble\n\nExpliquez ici le concept ou protocole de manière claire et synthétique...\n\n## 2. Points essentiels à retenir\n\n- Principe clé 1\n- Principe clé 2\n\n## 3. Configuration ou exemple concret\n\n```text\nExemple de commande ou formule mathématique...\n```"
        );
        setComment("Création initiale de la page");
        setSelectedDocIds([]);
        setSelectedWikiIds([]);
      }
      setPreviewMode(false);
      setShowOrganization(Boolean(page));
      setLinkSearch("");
    }
  }, [open, page, defaultTopic, defaultSection]);

  if (!open) return null;

  const finalTopic = topic === "Autre" ? customTopic.trim() || "Général" : topic;

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleWikiPage = (wikiId: string) => {
    setSelectedWikiIds((prev) =>
      prev.includes(wikiId) ? prev.filter((id) => id !== wikiId) : [...prev, wikiId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Veuillez saisir un titre pour la page");
      return;
    }

    setSaving(true);
    try {
      let result: WikiPage;
      if (page) {
        result = await wiki.updatePage(page.id, {
          title: title.trim(),
          topic: finalTopic,
          section: section.trim() || "Général",
          content,
          related_document_ids: selectedDocIds,
          related_wiki_ids: selectedWikiIds,
          comment: comment.trim() || "Mise à jour du contenu",
        });
        toast.success(`Page « ${result.title} » mise à jour avec succès`);
      } else {
        result = await wiki.createPage({
          title: title.trim(),
          topic: finalTopic,
          section: section.trim() || "Général",
          content,
          workspace_id: activeWorkspaceId || undefined,
          related_document_ids: selectedDocIds,
          related_wiki_ids: selectedWikiIds,
        });
        toast.success(`Page « ${result.title} » ajoutée au Wiki`);
      }

      onSaved(result);
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'enregistrement de la page");
    } finally {
      setSaving(false);
    }
  };

  // Filter other wiki pages that can be linked
  const potentialLinkedWikis = allWikiPages.filter((p) => p.id !== page?.id);
  const normalizedLinkSearch = linkSearch.trim().toLowerCase();
  const filteredLinkedWikis = potentialLinkedWikis
    .filter((p) => !selectedWikiIds.includes(p.id))
    .filter((p) => !normalizedLinkSearch || p.title.toLowerCase().includes(normalizedLinkSearch))
    .slice(0, 6);
  const filteredFiles = availableFiles
    .filter((file) => !selectedDocIds.includes(file.id))
    .filter((file) => !normalizedLinkSearch || file.name.toLowerCase().includes(normalizedLinkSearch))
    .slice(0, 6);

  return (
    <div
      id="wiki-editor-modal"
      className="fixed inset-0 z-50 bg-[#0B0E12] text-zinc-100 overflow-hidden"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-8 py-3 border-b border-zinc-800/80 bg-[#12151B] flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer l'éditeur"
            title="Fermer l'éditeur"
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
          <BookOpen className="h-4 w-4 text-emerald-400 shrink-0" />
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la page Wiki"
            className="min-w-0 flex-1 bg-transparent text-lg sm:text-xl font-semibold text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
          <button
            type="submit"
            form="wiki-editor-form"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 shrink-0"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Publication..." : page ? "Mettre à jour" : "Publier"}</span>
          </button>
        </div>

        {/* Form Body */}
        <form id="wiki-editor-form" onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          <main className="flex-1 min-w-0 overflow-y-auto px-5 py-6 sm:px-10 lg:px-16">
            <div className="mx-auto max-w-4xl space-y-6">
          <details open={showOrganization} onToggle={(event) => setShowOrganization(event.currentTarget.open)} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200">
              <FolderTree className="h-3.5 w-3.5 text-sky-400" />
              Organisation
              <span className="text-[10px] font-normal text-zinc-600">Pôle et section</span>
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400">Pôle thématique</label>
                <div className="flex gap-2">
                  <select value={topic} onChange={(e) => setTopic(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-200 border border-zinc-800 focus:outline-none focus:border-emerald-500">
                    {COMMON_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                    <option value="Autre">Autre</option>
                  </select>
                  {topic === "Autre" && <input value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="Nom du pôle" className="min-w-0 flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-200 border border-zinc-800 focus:outline-none focus:border-emerald-500" />}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400">Section</label>
                <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="Ex: Routage, Fondamentaux..." className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-200 border border-zinc-800 focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </details>

          {/* Editor Tabs: Edit vs Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300">
                Contenu de la page (Markdown) <span className="text-emerald-400">*</span>
              </label>
              <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    !previewMode
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Éditeur</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    previewMode
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>Aperçu</span>
                </button>
              </div>
            </div>

            {previewMode ? (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 min-h-[260px] max-h-[360px] overflow-y-auto prose prose-invert prose-zinc text-xs">
                <div className="whitespace-pre-wrap font-sans leading-relaxed text-zinc-200">
                  {content || "*Aucun contenu rédigé pour le moment.*"}
                </div>
              </div>
            ) : (
              <textarea
                rows={24}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Titre...\n\nContenu rédigé en markdown..."
                className="min-h-[55vh] w-full resize-y rounded-xl bg-zinc-900/70 border border-zinc-800 p-5 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            )}
          </div>

          {/* Change log comment for history */}
          {page && (
            <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
              <label className="text-xs font-semibold text-zinc-400">
                Commentaire de modification (Optionnel)
              </label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex: Précision sur les états d'adjacence, ajout commandes Cisco..."
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

            </div>
          </main>

          <aside className="w-full lg:w-80 xl:w-96 shrink-0 overflow-y-auto border-t lg:border-l lg:border-t-0 border-zinc-800/80 bg-[#10141A] px-4 py-5">
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <Link2 className="h-3.5 w-3.5 text-emerald-400" />
                  Liens et sources
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">Ajoutez des relations au fur et à mesure de votre rédaction.</p>
              </div>

              {(selectedDocIds.length > 0 || selectedWikiIds.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDocIds.map((id) => {
                    const file = availableFiles.find((item) => item.id === id);
                    return file ? <button key={id} type="button" onClick={() => toggleDoc(id)} className="inline-flex max-w-full items-center gap-1 rounded-md bg-sky-500/10 px-2 py-1 text-[10px] text-sky-300 border border-sky-500/25"><FileText className="h-3 w-3 shrink-0" /><span className="truncate">{file.name}</span><X className="h-3 w-3 shrink-0" /></button> : null;
                  })}
                  {selectedWikiIds.map((id) => {
                    const wikiPage = potentialLinkedWikis.find((item) => item.id === id);
                    return wikiPage ? <button key={id} type="button" onClick={() => toggleWikiPage(id)} className="inline-flex max-w-full items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 border border-emerald-500/25"><BookOpen className="h-3 w-3 shrink-0" /><span className="truncate">{wikiPage.title}</span><X className="h-3 w-3 shrink-0" /></button> : null;
                  })}
                </div>
              )}

              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)} placeholder="Rechercher un document ou une notion..." className="w-full rounded-lg bg-zinc-900 px-9 py-2 text-xs text-zinc-200 placeholder-zinc-500 border border-zinc-800 focus:outline-none focus:border-emerald-500" />
              </div>

              {linkSearch.trim() && (
                <div className="space-y-1.5">
                  {filteredFiles.map((file) => <button key={file.id} type="button" onClick={() => toggleDoc(file.id)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800"><FileText className="h-3.5 w-3.5 text-sky-400 shrink-0" /><span className="truncate">{file.name}</span></button>)}
                  {filteredLinkedWikis.map((wikiPage) => <button key={wikiPage.id} type="button" onClick={() => toggleWikiPage(wikiPage.id)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800"><BookOpen className="h-3.5 w-3.5 text-emerald-400 shrink-0" /><span className="truncate">{wikiPage.title}</span></button>)}
                  {filteredFiles.length === 0 && filteredLinkedWikis.length === 0 && <p className="px-2 py-3 text-[11px] text-zinc-500">Aucun résultat.</p>}
                </div>
              )}

              <div className="border-t border-zinc-800/80 pt-4">
                <button type="button" onClick={() => onOpenChange(false)} className="w-full rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors">Annuler</button>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
