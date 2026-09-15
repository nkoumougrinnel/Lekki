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
  Check,
  Link2,
  FolderTree,
  Tag,
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

  return (
    <div
      id="wiki-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-[#12151B] border border-zinc-800 rounded-2xl max-w-4xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#151922]">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100">
              {page ? `Modifier : ${page.title}` : "Rédiger une nouvelle page Wiki"}
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Titre de la page <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: OSPF — Comprendre simplement, Modèle OSI, VLAN..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Topic & Section Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Topic Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-emerald-400" />
                <span>Pôle thématique</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  {COMMON_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Autre">Autre (personnalisé)...</option>
                </select>
                {topic === "Autre" && (
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Nom du pôle..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                )}
              </div>
            </div>

            {/* Section Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <FolderTree className="h-3.5 w-3.5 text-sky-400" />
                <span>Section de connaissance</span>
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="Ex: Fondamentaux, Routage, Commutation, Transmission..."
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Cross-linking: Related Wiki Pages (Section 6) */}
          {potentialLinkedWikis.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-zinc-800/80">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Notions reliées / Pages connexes ({selectedWikiIds.length})</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  Permet la navigation transversale entre concepts
                </span>
              </label>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                {potentialLinkedWikis.map((wp) => {
                  const isSelected = selectedWikiIds.includes(wp.id);
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => toggleWikiPage(wp.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium"
                          : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-emerald-400" />}
                      <span>{wp.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drive source documents association */}
          {availableFiles.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-zinc-800/80">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-sky-400" />
                  <span>Documents sources originaux du Drive ({selectedDocIds.length})</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  Rattachez des cours PDF, TD ou mémoires
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                {availableFiles.map((file) => {
                  const isSelected = selectedDocIds.includes(file.id);
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => toggleDoc(file.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-200"
                          : "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center shrink-0 text-[10px] ${
                          isSelected ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{file.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Editor Tabs: Edit vs Preview */}
          <div className="space-y-2 pt-1 border-t border-zinc-800/80">
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
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Titre...\n\nContenu rédigé en markdown..."
                className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 leading-relaxed"
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

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? "Enregistrement..." : page ? "Mettre à jour" : "Créer la page"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
