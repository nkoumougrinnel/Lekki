import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { DriveFile, WikiPage, Workspace, NavView } from "@/types/lekki";
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowUp,
  FileCheck2,
  GraduationCap,
  UserPlus,
  Users,
  Library,
  CheckCircle2,
  Clock,
  Upload,
  FolderOpen,
} from "lucide-react";
import { DocumentTypeIcon } from "./DocumentTypeIcon";
import { StudentDocBadge } from "./StudentDocBadge";
import { classifyFile, prettyName } from "@/lib/studentDocs";
import { workspaces as workspacesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { RevisionMode } from "./RevisionPanel";

interface HomeOverviewProps {
  files: DriveFile[];
  wikiPages: WikiPage[];
  activeWorkspace: Workspace | null;
  onNavigate: (view: NavView) => void;
  onOpenFile: (file: DriveFile) => void;
  onOpenWiki: (page: WikiPage) => void;
  onOpenSearch: () => void;
  onOpenAI: () => void;
  onAsk: (question: string) => void;
  onOpenRevision: (mode: RevisionMode, fileId?: string) => void;
}

export function HomeOverview({
  files,
  wikiPages,
  activeWorkspace,
  onNavigate,
  onOpenFile,
  onOpenWiki,
  onAsk,
  onOpenRevision,
}: HomeOverviewProps) {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const firstName = (user?.name || "").split(" ")[0];

  const spaceFiles = useMemo(
    () =>
      files
        .filter((f) => !f.is_deleted && (activeWorkspace ? f.workspace_id === activeWorkspace.id : !f.workspace_id))
        .map((file) => ({ file, info: classifyFile(file) })),
    [files, activeWorkspace]
  );
  const exams = spaceFiles
    .filter(({ info }) => info.isExam)
    .sort((a, b) => (b.info.year || "").localeCompare(a.info.year || "") || b.file.updated_at.localeCompare(a.file.updated_at));
  const courses = spaceFiles
    .filter(({ info }) => !info.isExam)
    .sort((a, b) => new Date(b.file.updated_at).getTime() - new Date(a.file.updated_at).getTime());
  const recentWiki = [...wikiPages]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4);
  const verifiedCount = wikiPages.filter((w) => w.status === "verified").length;

  const suggestions = useMemo(() => {
    const picks = courses.slice(0, 2).map(({ file }) => `Résume « ${prettyName(file.name)} »`);
    if (exams[0]) picks.push(`Quelles notions tombent dans « ${prettyName(exams[0].file.name)} » ?`);
    return picks.length ? picks : ["Que contiennent les documents de cet espace ?"];
  }, [courses, exams]);

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const value = question.trim();
    if (!value) return;
    onAsk(value);
    setQuestion("");
  };

  const invite = async () => {
    if (!activeWorkspace) {
      toast.info("Crée d’abord l’espace de ta promo, de ton club ou de ton groupe.");
      return;
    }
    if (!["owner", "admin"].includes(activeWorkspace.role || "")) {
      toast.info("Demande le code d’invitation à un admin de l’espace.");
      return;
    }
    try {
      const { code } = await workspacesApi.getJoinCode(activeWorkspace.id);
      const message = `Rejoins « ${activeWorkspace.name} » sur Lekki avec le code ${code} : ${window.location.origin}`;
      try {
        await navigator.clipboard.writeText(message);
        toast.success(`Code ${code} copié. Colle-le dans le groupe WhatsApp de la promo.`);
      } catch {
        toast.success(`Code d’invitation : ${code}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de récupérer le code.");
    }
  };

  const isEmpty = spaceFiles.length === 0 && wikiPages.length === 0;

  return (
    <div id="home-overview-container" className="flex-1 overflow-y-auto bg-[#0E1116] p-4 sm:p-8 space-y-6 sm:space-y-8">
      {/* Accueil : poser une question tout de suite */}
      <section className="rounded-2xl bg-gradient-to-br from-[#141820] via-[#161B24] to-[#12151B] border border-zinc-800/80 p-5 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <p className="text-xs font-medium text-emerald-300/90">
            {firstName ? `Bonjour ${firstName}` : "Bonjour"}
            {activeWorkspace ? ` · ${activeWorkspace.name}` : " · Mon espace"}
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-100 leading-tight">
            Que révises-tu <span className="text-emerald-400 whitespace-nowrap">aujourd’hui&nbsp;?</span>
          </h1>

          <form onSubmit={submit} className="relative">
            <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Pose une question sur tes cours, TD ou anciens sujets…"
              aria-label="Question pour Lekki AI"
              className="w-full rounded-xl border border-zinc-700/70 bg-[#0D1015]/90 py-3.5 pl-11 pr-14 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
            />
            <button
              type="submit"
              disabled={!question.trim()}
              aria-label="Demander à Lekki AI"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onAsk(suggestion)}
                className="max-w-full truncate rounded-full border border-zinc-700/60 bg-zinc-900/60 px-3 py-1.5 text-[11px] text-zinc-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => onOpenRevision("quiz")}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300"
            >
              <GraduationCap className="h-3.5 w-3.5" /> Réviser avec un quiz
            </button>
            <button
              onClick={() => onOpenRevision("correction")}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700/70 bg-zinc-900/50 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              <FileCheck2 className="h-3.5 w-3.5" /> Corriger un ancien sujet
            </button>
            <button
              onClick={() => void invite()}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700/70 bg-zinc-900/50 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              <UserPlus className="h-3.5 w-3.5" /> Inviter ma promo
            </button>
          </div>
        </div>
      </section>

      {isEmpty ? (
        <section className="rounded-2xl border border-dashed border-zinc-800 p-5 sm:p-8">
          <h2 className="text-sm font-semibold text-zinc-100">Lance l’espace de ta promo en 3 étapes</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Upload, title: "Importe un dossier", text: "Cours, TD, anciens sujets : glisse un dossier entier, l’arborescence est conservée.", action: () => onNavigate(activeWorkspace ? "workspace_files" : "my_docs"), cta: "Ouvrir le Drive" },
              { icon: Users, title: "Invite tes camarades", text: "Partage le code d’invitation dans le groupe WhatsApp de la promo ou du club.", action: () => void invite(), cta: "Copier le code" },
              { icon: GraduationCap, title: "Révisez ensemble", text: "Questions sourcées, quiz par chapitre, corrections d’anciens sujets.", action: () => onOpenRevision("quiz"), cta: "Essayer" },
            ].map(({ icon: Icon, title, text, action, cta }, index) => (
              <li key={title} className="rounded-xl bg-[#12151B] p-4 ring-1 ring-inset ring-zinc-800">
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-400/10 text-[11px] font-bold">{index + 1}</span>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-sm font-medium text-zinc-100">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{text}</p>
                <button onClick={action} className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline">
                  {cta} <ArrowRight className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <>
          {/* Chiffres clés de l'espace */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Library} tone="text-emerald-400" value={courses.length} title="Cours & TD" hint="Documents de cours" onClick={() => onNavigate(activeWorkspace ? "workspace_files" : "my_docs")} />
            <StatCard icon={FileCheck2} tone="text-rose-300" value={exams.length} title="Anciens sujets" hint="Examens, RAT, CC" onClick={() => onOpenRevision("correction")} />
            <StatCard icon={BookOpen} tone="text-sky-400" value={wikiPages.length} title="Fiches du wiki" hint={`${verifiedCount} vérifiée${verifiedCount > 1 ? "s" : ""}`} onClick={() => onNavigate(activeWorkspace ? "workspace_wiki" : "my_docs")} />
            <StatCard icon={Users} tone="text-violet-300" value={activeWorkspace?.members_count ?? 1} title="Membres" hint={activeWorkspace ? "Inviter avec un code" : "Espace personnel"} onClick={() => void invite()} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Anciens sujets */}
            <section className="space-y-3">
              <SectionTitle icon={FileCheck2} title="Anciens sujets" action={exams.length ? { label: "Tout corriger", onClick: () => onOpenRevision("correction") } : undefined} />
              {exams.length ? (
                <ul className="space-y-2">
                  {exams.slice(0, 6).map(({ file, info }) => (
                    <li key={file.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#12151B] p-3 transition hover:border-zinc-700">
                      <button onClick={() => onOpenFile(file)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                        <span className="rounded bg-zinc-800 p-1.5 ring-1 ring-zinc-700/60">
                          <DocumentTypeIcon extension={file.extension} className="h-5 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-zinc-200">{prettyName(file.name)}</span>
                          <span className="mt-1 block"><StudentDocBadge info={info} /></span>
                        </span>
                      </button>
                      <button
                        onClick={() => onOpenRevision("correction", file.id)}
                        className="shrink-0 rounded-lg border border-emerald-400/25 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-400/10"
                      >
                        Corriger
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyCard text="Aucun ancien sujet détecté. Nomme-les comme « TS_Examen_CL_2024 » ou range-les dans un dossier SUJETS." />
              )}
            </section>

            {/* Cours et TD récents */}
            <section className="space-y-3">
              <SectionTitle icon={FolderOpen} title="Cours & TD récents" action={{ label: "Ouvrir le Drive", onClick: () => onNavigate(activeWorkspace ? "workspace_files" : "my_docs") }} />
              {courses.length ? (
                <ul className="space-y-2">
                  {courses.slice(0, 6).map(({ file, info }) => (
                    <li key={file.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#12151B] p-3 transition hover:border-zinc-700">
                      <button onClick={() => onOpenFile(file)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                        <span className="rounded bg-zinc-800 p-1.5 ring-1 ring-zinc-700/60">
                          <DocumentTypeIcon extension={file.extension} className="h-5 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-zinc-200">{prettyName(file.name)}</span>
                          <span className="mt-1 block"><StudentDocBadge info={info} compact /></span>
                        </span>
                      </button>
                      <button
                        onClick={() => onOpenRevision("quiz", file.id)}
                        className="shrink-0 rounded-lg border border-zinc-700/70 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-zinc-800"
                      >
                        Quiz
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyCard text="Aucun cours pour l’instant. Importe le dossier de cours de la promo depuis le Drive." />
              )}
            </section>
          </div>

          {recentWiki.length > 0 && (
            <section className="space-y-3">
              <SectionTitle icon={BookOpen} title="Fiches du wiki" action={{ label: "Ouvrir le wiki", onClick: () => onNavigate(activeWorkspace ? "workspace_wiki" : "my_docs") }} />
              <ul className="grid gap-2 sm:grid-cols-2">
                {recentWiki.map((page) => (
                  <li key={page.id}>
                    <button
                      onClick={() => onOpenWiki(page)}
                      className="w-full rounded-xl border border-zinc-800 bg-[#12151B] p-3 text-left transition hover:border-zinc-700"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium text-zinc-200">{page.title}</span>
                        {page.status === "verified" ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" aria-label="Vérifiée" />
                        ) : (
                          <Clock className="h-3 w-3 shrink-0 text-amber-400" aria-label="Non vérifiée" />
                        )}
                      </span>
                      <span className="mt-1 block line-clamp-1 text-[11px] text-zinc-500">
                        {page.section && page.section !== "Général" ? `${page.section} · ` : ""}
                        {page.content.replace(/[#*`_>]/g, "").replace(page.title, "").trim().slice(0, 110)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon, tone, value, title, hint, onClick,
}: { icon: React.ElementType; tone: string; value: number; title: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-zinc-800 bg-[#12151B] p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900/80">
      <div className="mb-2 flex items-center justify-between">
        <Icon className={`h-5 w-5 ${tone}`} />
        <span className="font-mono text-sm font-semibold text-zinc-200">{value}</span>
      </div>
      <div className="text-xs font-semibold text-zinc-200">{title}</div>
      <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{hint}</p>
    </button>
  );
}

function SectionTitle({
  icon: Icon, title, action,
}: { icon: React.ElementType; title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
        <Icon className="h-4 w-4 text-emerald-400" /> {title}
      </h2>
      {action && (
        <button onClick={action.onClick} className="flex items-center gap-1 text-xs text-emerald-400 hover:underline">
          {action.label} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-800 p-5 text-center text-xs leading-relaxed text-zinc-500">{text}</div>;
}
