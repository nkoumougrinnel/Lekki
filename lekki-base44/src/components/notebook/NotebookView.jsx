import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { askLekki, generateArtefact } from "@/lib/server-fns";
import { AppShell } from "@/components/app/AppShell";
import { CreateEspaceDialog } from "@/components/home/CreateEspaceDialog";
import { NotebookHeader } from "@/components/notebook/NotebookHeader";
import { MobilePanelTabs } from "@/components/notebook/MobilePanelTabs";
import { SourcesPanel } from "@/components/notebook/SourcesPanel";
import { ChatPanel } from "@/components/notebook/ChatPanel";
import { StudioPanel } from "@/components/notebook/StudioPanel";
import { SourceViewer } from "@/components/notebook/SourceViewer";
import { AddSourcesDialog } from "@/components/notebook/AddSourcesDialog";
import { ArtefactDialog } from "@/components/notebook/ArtefactDialog";
import { NoteEditorDialog } from "@/components/notebook/NoteEditorDialog";
import { cn } from "@/lib/utils";

export function NotebookView({ espaceId }) {
  const askFn = useServerFn(askLekki);
  const generateFn = useServerFn(generateArtefact);

  const [espace, setEspace] = useState(null);
  const [espaces, setEspaces] = useState([]);
  const [sources, setSources] = useState([]);
  const [notes, setNotes] = useState([]);
  const [artefacts, setArtefacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [panel, setPanel] = useState("chat");
  const [addOpen, setAddOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [artefact, setArtefact] = useState(null);
  const [noteDraft, setNoteDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [espaceRecord, sourcePage, notePage, artefactPage, espacePage] = await Promise.all([
        base44.entities.Espace.get(espaceId),
        base44.entities.Source.filter({ espace_id: espaceId }, { sort: "-created_date", limit: 100 }),
        base44.entities.Note.filter({ espace_id: espaceId }, { sort: "-updated_date", limit: 50 }),
        base44.entities.Artefact.filter({ espace_id: espaceId }, { sort: "-created_date", limit: 30 }),
        base44.entities.Espace.filter({}, { sort: "-updated_date", limit: 20 }),
      ]);

      const conversationPage = await base44.entities.Conversation.filter(
        { espace_id: espaceId },
        { sort: "-last_message_at", limit: 1 },
      );
      const conversation = conversationPage.items?.[0];
      const messagePage = conversation
        ? await base44.entities.Message.filter(
            { conversation_id: conversation.id },
            { sort: "created_date", limit: 100 },
          )
        : { items: [] };

      setEspace(espaceRecord);
      setSources(sourcePage.items || []);
      setNotes(notePage.items || []);
      setArtefacts(artefactPage.items || []);
      setEspaces(espacePage.items || []);
      setConversationId(conversation?.id || null);
      setMessages(messagePage.items || []);
      setSelectedIds((previous) => {
        const ids = (sourcePage.items || []).map((source) => source.id);
        const kept = previous.filter((id) => ids.includes(id));
        return kept.length ? kept : ids;
      });

      base44.entities.Espace.update(espaceId, { last_opened_at: new Date().toISOString() }).catch(() => {});
    } catch {
      toast.error("Cet espace est introuvable.");
    } finally {
      setLoading(false);
    }
  }, [espaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const ask = useCallback(
    async (question) => {
      const text = String(question || "").trim();
      if (!text || asking) return;
      if (!sources.length) {
        toast.error("Ajoute d’abord une source à cet espace.");
        setAddOpen(true);
        return;
      }
      setPanel("chat");
      setAsking(true);
      const tempId = `temp-${Date.now()}`;
      setMessages((previous) => [...previous, { id: tempId, role: "user", content: text }]);
      try {
        const result = await askFn({
          data: { espaceId, question: text, sourceIds: selectedIds, conversationId },
        });
        setConversationId(result.conversationId);
        setMessages((previous) => [
          ...previous,
          {
            id: result.message.id,
            role: "assistant",
            content: result.answer,
            citations: result.citations,
            follow_ups: result.follow_ups,
          },
        ]);
      } catch {
        setMessages((previous) => previous.filter((message) => message.id !== tempId));
        toast.error("Lekki n’a pas pu répondre. Réessaie dans un instant.");
      } finally {
        setAsking(false);
      }
    },
    [askFn, asking, conversationId, espaceId, selectedIds, sources.length],
  );

  const generate = async (type) => {
    if (generating) return;
    if (!sources.length) {
      toast.error("Ajoute d’abord une source à cet espace.");
      setAddOpen(true);
      return;
    }
    setGenerating(type);
    try {
      const result = await generateFn({ data: { espaceId, type, sourceIds: selectedIds } });
      const created = await base44.entities.Artefact.create({
        espace_id: espaceId,
        type: result.type,
        title: result.title,
        content: result.content,
        audio_url: result.audio_url || "",
        source_ids: selectedIds,
      });
      setArtefacts((previous) => [created, ...previous]);
      setArtefact(created);
      toast.success("C’est prêt.");
    } catch {
      toast.error("La génération a échoué. Réessaie dans un instant.");
    } finally {
      setGenerating(null);
    }
  };

  const toggleSource = (id) => {
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );
  };

  const toggleAll = () => {
    setSelectedIds((previous) => (previous.length === sources.length ? [] : sources.map((source) => source.id)));
  };

  const deleteSource = async (source) => {
    try {
      await base44.entities.Source.delete(source.id);
      setSources((previous) => previous.filter((item) => item.id !== source.id));
      setSelectedIds((previous) => previous.filter((id) => id !== source.id));
      toast.success("Source supprimée.");
    } catch {
      toast.error("Impossible de supprimer cette source.");
    }
  };

  const deleteArtefact = async (item) => {
    try {
      await base44.entities.Artefact.delete(item.id);
      setArtefacts((previous) => previous.filter((value) => value.id !== item.id));
      setArtefact(null);
    } catch {
      toast.error("Impossible de supprimer cet élément.");
    }
  };

  const openCitation = (citation) => {
    const match = sources.find((source) => source.id === citation.source_id);
    if (match) setViewer(match);
  };

  const saveNote = async (draft) => {
    const payload = {
      espace_id: espaceId,
      title: draft.title?.trim() || "Note sans titre",
      content: draft.content || "",
    };
    try {
      if (draft.id) {
        const updated = await base44.entities.Note.update(draft.id, payload);
        setNotes((previous) => previous.map((note) => (note.id === updated.id ? updated : note)));
      } else {
        const created = await base44.entities.Note.create(payload);
        setNotes((previous) => [created, ...previous]);
      }
      toast.success("Note enregistrée.");
      setNoteDraft(null);
    } catch {
      toast.error("Impossible d’enregistrer cette note.");
    }
  };

  const deleteNote = async (note) => {
    try {
      await base44.entities.Note.delete(note.id);
      setNotes((previous) => previous.filter((item) => item.id !== note.id));
      setNoteDraft(null);
    } catch {
      toast.error("Impossible de supprimer cette note.");
    }
  };

  const saveAnswer = async (message) => {
    try {
      const created = await base44.entities.Note.create({
        espace_id: espaceId,
        title: `Réponse · ${new Date().toLocaleDateString("fr-FR")}`,
        content: message.content,
        source_ids: (message.citations || []).map((citation) => citation.source_id),
      });
      setNotes((previous) => [created, ...previous]);
      toast.success("Réponse enregistrée dans les notes.");
    } catch {
      toast.error("Impossible d’enregistrer cette réponse.");
    }
  };

  const renameEspace = async (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed || trimmed === espace?.name) return;
    try {
      const updated = await base44.entities.Espace.update(espaceId, { name: trimmed });
      setEspace(updated);
      setEspaces((previous) =>
        previous.map((item) => (item.id === updated.id ? { ...item, name: updated.name } : item)),
      );
    } catch {
      toast.error("Impossible de renommer cet espace.");
    }
  };

  return (
    <AppShell espaces={espaces} activeEspaceId={espaceId} onCreate={() => setCreateOpen(true)}>
      <NotebookHeader
        espace={espace}
        loading={loading}
        sourceCount={sources.length}
        noteCount={notes.length}
        onAdd={() => setAddOpen(true)}
        onRename={renameEspace}
      />

      <MobilePanelTabs value={panel} onChange={setPanel} sourceCount={sources.length} />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          className={cn(
            "min-h-0 flex-1 flex-col border-[#E7E4D9] bg-white md:flex md:w-[286px] md:flex-none md:border-r",
            panel === "sources" ? "flex" : "hidden",
          )}
        >
          <SourcesPanel
            sources={sources}
            selectedIds={selectedIds}
            loading={loading}
            onToggle={toggleSource}
            onToggleAll={toggleAll}
            onAdd={() => setAddOpen(true)}
            onOpen={setViewer}
            onDelete={deleteSource}
          />
        </aside>

        <section
          className={cn(
            "min-h-0 flex-1 flex-col bg-white md:flex",
            panel === "chat" ? "flex" : "hidden",
          )}
        >
          <ChatPanel
            espace={espace}
            messages={messages}
            asking={asking}
            sources={sources}
            selectedCount={selectedIds.length}
            onAsk={ask}
            onOpenCitation={openCitation}
            onSaveAnswer={saveAnswer}
            onOpenSources={() => setAddOpen(true)}
            onOpenPanel={setPanel}
          />
        </section>

        <aside
          className={cn(
            "min-h-0 flex-1 flex-col border-[#E7E4D9] bg-[#F7F5EF] md:flex md:w-[318px] md:flex-none md:border-l",
            panel === "studio" ? "flex" : "hidden",
          )}
        >
          <StudioPanel
            artefacts={artefacts}
            notes={notes}
            generating={generating}
            sourceCount={sources.length}
            onGenerate={generate}
            onOpenArtefact={setArtefact}
            onDeleteArtefact={deleteArtefact}
            onNewNote={() => setNoteDraft({ title: "", content: "" })}
            onOpenNote={setNoteDraft}
          />
        </aside>
      </div>

      <AddSourcesDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        espaceId={espaceId}
        onAdded={(source) => {
          setSources((previous) => [source, ...previous]);
          setSelectedIds((previous) => [...previous, source.id]);
        }}
      />

      <SourceViewer source={viewer} open={Boolean(viewer)} onOpenChange={(value) => !value && setViewer(null)} />

      <ArtefactDialog
        artefact={artefact}
        open={Boolean(artefact)}
        onOpenChange={(value) => !value && setArtefact(null)}
        onDelete={deleteArtefact}
      />

      <NoteEditorDialog
        draft={noteDraft}
        open={Boolean(noteDraft)}
        onOpenChange={(value) => !value && setNoteDraft(null)}
        onSave={saveNote}
        onDelete={deleteNote}
      />

      <CreateEspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}