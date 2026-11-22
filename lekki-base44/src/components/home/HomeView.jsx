import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, FileText, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { AppShell } from "@/components/app/AppShell";
import { CreateEspaceDialog } from "@/components/home/CreateEspaceDialog";
import { EspaceCard } from "@/components/home/EspaceCard";
import { firstNameOf, formatRelative, KIND_META, kindFromName } from "@/lib/lekki";

function EmptyState({ onCreate }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E7E4D9] bg-white px-6 py-14 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(45% 60% at 50% 0%, #EAF2E7 0%, transparent 70%), radial-gradient(35% 45% at 85% 15%, #F6E7C8 0%, transparent 72%)",
        }}
      />
      <div className="relative mx-auto max-w-md">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#16241D] text-[#FBFAF6]">
          <Sparkles className="h-6 w-6" />
        </span>
        <h2 className="mt-5 font-heading text-2xl font-semibold tracking-[-0.025em] text-[#16241D]">
          Ton premier espace t’attend
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5C6B62]">
          Crée un espace pour ta promo, importe les cours du semestre, puis pose ta première question.
          Lekki répondra en citant les pages.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#16241D] pl-5 pr-2 text-sm font-semibold text-[#FBFAF6] transition-colors hover:bg-[#24382D]"
        >
          Créer mon espace
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2E7D5B]">
            <Plus className="h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  );
}

export function HomeView() {
  const { user } = useAuth();
  const [espaces, setEspaces] = useState([]);
  const [counts, setCounts] = useState({ sources: {}, notes: {} });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sourceAgg, noteAgg, recentPage] = await Promise.all([
        base44.entities.Espace.filter({}, { sort: "-updated_date", limit: 60 }),
        base44.entities.Source.aggregate({ query: {}, groupBy: "espace_id" }),
        base44.entities.Note.aggregate({ query: {}, groupBy: "espace_id" }),
        base44.entities.Source.filter({}, { sort: "-created_date", limit: 5 }),
      ]);
      const toMap = (rows = []) =>
        rows.reduce((accumulator, row) => {
          accumulator[row.espace_id] = row.count;
          return accumulator;
        }, {});
      setEspaces(list.items || []);
      setCounts({ sources: toMap(sourceAgg.rows), notes: toMap(noteAgg.rows) });
      setRecent(recentPage.items || []);
    } catch {
      toast.error("Impossible de charger tes espaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return espaces;
    return espaces.filter(
      (espace) =>
        espace.name?.toLowerCase().includes(term) ||
        espace.description?.toLowerCase().includes(term),
    );
  }, [espaces, query]);

  const removeEspace = async (espace) => {
    try {
      await Promise.all([
        base44.entities.Source.deleteMany({ espace_id: espace.id }),
        base44.entities.Note.deleteMany({ espace_id: espace.id }),
        base44.entities.Artefact.deleteMany({ espace_id: espace.id }),
        base44.entities.Message.deleteMany({ espace_id: espace.id }),
        base44.entities.Conversation.deleteMany({ espace_id: espace.id }),
      ]);
      await base44.entities.Espace.delete(espace.id);
      toast.success(`« ${espace.name} » a été supprimé.`);
      load();
    } catch {
      toast.error("Impossible de supprimer cet espace.");
    }
  };

  const firstName = firstNameOf(user?.full_name, user?.email);
  const totalSources = Object.values(counts.sources).reduce((sum, value) => sum + value, 0);

  return (
    <AppShell espaces={espaces} onCreate={() => setCreateOpen(true)}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1120px] px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-[#2E7D5B]">Accueil</p>
              <h1 className="mt-2 font-heading text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-[#16241D] sm:text-[2.4rem]">
                {firstName ? `Bonjour, ${firstName}.` : "Bonjour."}
              </h1>
              <p className="mt-1.5 text-sm text-[#5C6B62]">
                {espaces.length
                  ? `${espaces.length} espace${espaces.length > 1 ? "s" : ""} · ${totalSources} source${totalSources > 1 ? "s" : ""} indexée${totalSources > 1 ? "s" : ""}`
                  : "Reprends une conversation ou crée l’espace de ta promo."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA096]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher un espace"
                  aria-label="Rechercher un espace"
                  className="h-10 w-full rounded-full border border-[#E7E4D9] bg-white pl-9 pr-4 text-[13px] text-[#16241D] outline-none transition-colors placeholder:text-[#9AA096] focus:border-[#2E7D5B]/50 focus:ring-2 focus:ring-[#2E7D5B]/10 sm:w-60"
                />
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="hidden h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#16241D] px-4 text-[13px] font-semibold text-[#FBFAF6] transition-colors hover:bg-[#24382D] sm:inline-flex"
              >
                <Plus className="h-4 w-4" /> Nouvel espace
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <div key={key} className="h-[196px] animate-pulse rounded-2xl border border-[#E7E4D9] bg-white/70" />
              ))}
            </div>
          ) : espaces.length === 0 ? (
            <div className="mt-8">
              <EmptyState onCreate={() => setCreateOpen(true)} />
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((espace) => (
                  <EspaceCard
                    key={espace.id}
                    espace={espace}
                    sourceCount={counts.sources[espace.id] || 0}
                    noteCount={counts.notes[espace.id] || 0}
                    onDelete={removeEspace}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="flex min-h-[196px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D8D4C6] bg-[#FBFAF6] p-5 text-[#5C6B62] transition-colors hover:border-[#2E7D5B]/40 hover:bg-[#F7F9F4] hover:text-[#2E7D5B]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-current">
                    <Plus className="h-4 w-4" />
                  </span>
                  <span className="text-[13px] font-medium">Créer un espace</span>
                </button>
              </div>

              {filtered.length === 0 && (
                <p className="mt-6 text-sm text-[#8A968E]">Aucun espace ne correspond à « {query} ».</p>
              )}

              {recent.length > 0 && (
                <section className="mt-10">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-[15px] font-semibold text-[#16241D]">
                      Documents récents
                    </h2>
                    <span className="text-[11.5px] text-[#8A968E]">Derniers imports</span>
                  </div>
                  <ul className="mt-3 divide-y divide-[#F1EFE6] overflow-hidden rounded-2xl border border-[#E7E4D9] bg-white">
                    {recent.map((source) => {
                      const meta = KIND_META[kindFromName(source.name)] || KIND_META.txt;
                      return (
                        <li key={source.id}>
                          <Link
                            to="/espaces/$espaceId"
                            params={{ espaceId: source.espace_id }}
                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FBFAF6]"
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                              <FileText className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-[#16241D]">{source.name}</p>
                              <p className="truncate text-[11px] text-[#8A968E]">
                                {meta.label}
                                {source.page_count ? ` · ${source.page_count} pages` : ""} ·{" "}
                                {formatRelative(source.created_date)}
                              </p>
                            </div>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#B3B7AE]" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <CreateEspaceDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => load()} />
      {loading && (
        <span className="sr-only">
          <Loader2 className="animate-spin" /> Chargement
        </span>
      )}
    </AppShell>
  );
}