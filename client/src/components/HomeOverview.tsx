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
  Library as LibraryIcon,
  CheckCircle2,
  Clock,
  Upload,
  FolderOpen,
  Camera,
} from "lucide-react";
import { DocumentTypeIcon } from "./DocumentTypeIcon";
import { StudentDocBadge } from "./StudentDocBadge";
import { prettyName } from "@/lib/studentDocs";
import type { Library } from "@/lib/library";
import { academicLabel } from "@/lib/curriculum";
import { SubjectCard } from "./SubjectsView";
import { workspaces as workspacesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { RevisionMode } from "./RevisionPanel";
import { spaceWording } from "@/lib/spaces";
import { SpaceNews } from "./SpaceNews";
import { shareText } from "@/lib/share";
import { inviteLink } from "@/lib/pendingLinks";

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
  onScan?: () => void;
  library: Library;
  onOpenSubject: (subjectId: string) => void;
}

export function HomeOverview({
  files,
  wikiPages,
  activeWorkspace,
  onNavigate,
  onOpenFile,
  onOpenWiki,
  onAsk,
  onOpenAI,
  onOpenRevision,
  onScan,
  library,
  onOpenSubject,
}: HomeOverviewProps) {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const firstName = (user?.name || "").split(" ")[0];

  const spaceFiles = library.entries;
  const exams = spaceFiles
    .filter(({ info }) => info.isExam)
    .sort((a, b) => (b.info.year || "").localeCompare(a.info.year || "") || b.file.updated_at.localeCompare(a.file.updated_at));
  const courses = spaceFiles
    .filter(({ info }) => !info.isExam && info.kind !== "corrige")
    .sort((a, b) => new Date(b.file.updated_at).getTime() - new Date(a.file.updated_at).getTime());
  const recentWiki = [...wikiPages]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4);
  const verifiedCount = wikiPages.filter((w) => w.status === "verified").length;

  const suggestions = useMemo(() => {
    // Les documents rattachés à une matière d'abord : ce sont eux qu'on révise.
    const bySubject = <T extends { subject: unknown }>(list: T[]) => [...list].sort((a, b) => Number(!a.subject) - Number(!b.subject));
    const picks = bySubject(courses).slice(0, 2).map(({ file }) => `Résume « ${prettyName(file.name)} »`);
    const exam = bySubject(exams)[0];
    if (exam) picks.push(`Quelles notions tombent dans « ${prettyName(exam.file.name)} » ?`);
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
      await shareText(
        `Rejoindre ${activeWorkspace.name}`,
        `Rejoins « ${activeWorkspace.name} » sur Lekki (code ${code}) :`,
        inviteLink(code)
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de récupérer le code.");
    }
  };

  const narrow = typeof window !== "undefined" && window.innerWidth < 640;
  const isEmpty = spaceFiles.length === 0 && wikiPages.length === 0;
  const wording = spaceWording(activeWorkspace);
  const semesterSubjects = library.current ? library.subjectsOfSemester(library.current) : [];
  const canManage = ["owner", "admin"].includes(activeWorkspace?.role || "");
  // Lecteur : membre simple d'un espace. Il consulte, révise et ajoute ; il n'administre pas.
  const isReader = Boolean(activeWorkspace) && !canManage;

  return (
    <div id="home-overview-container" className="flex-1 overflow-y-auto bg-[#0E1116] p-4 sm:p-8 space-y-6 sm:space-y-8">
      {/* Accueil : poser une question tout de suite */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-[#141820] via-[#161B24] to-[#12151B] p-4 shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl sm:h-80 sm:w-80" />
        <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-5">
          <div className="space-y-1.5">
            <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-emerald-300/90">
              <span className="shrink-0">{firstName ? `Bonjour ${firstName}` : "Bonjour"}</span>
              <span className="truncate text-zinc-500">
                · {activeWorkspace ? activeWorkspace.name : "Mon espace"}
                {library.academic && library.current ? ` · S${library.current}` : ""}
              </span>
            </p>
            <h1 className="text-[1.65rem] font-extrabold leading-[1.15] tracking-tight text-zinc-100 sm:text-4xl">
              {wording.headline[0]}{" "}
              <span className="whitespace-nowrap text-emerald-400">{wording.headline[1].replace(" ?", "\u00a0?")}</span>
            </h1>
          </div>

          <form onSubmit={submit} className="relative">
            <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={narrow ? "Pose ta question à Lekki…" : wording.askPlaceholder}
              aria-label="Question pour Lekki"
              enterKeyHint="send"
              className="h-12 w-full truncate rounded-xl border border-zinc-700/70 bg-[#0D1015]/90 pl-11 pr-14 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10 max-sm:placeholder:text-[13px]"
            />
            <button
              type="submit"
              disabled={!question.trim()}
              aria-label="Demander à Lekki"
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>

          {/* Suggestions : une seule ligne qui défile sur mobile, plutôt qu'un empilement. */}
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onAsk(suggestion)}
                className="min-h-9 max-w-[16rem] shrink-0 snap-start truncate rounded-full border border-zinc-700/60 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-400/40 hover:text-emerald-200 sm:max-w-full sm:text-[11px]"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Actions : grille de tuiles sur mobile (pouce), rangée de boutons sur ordinateur. */}
          {(() => {
            const actions: { key: string; icon: React.ElementType; label: string; short: string; onClick: () => void; primary?: boolean }[] = [];
            if (wording.study) {
              actions.push({ key: "quiz", icon: GraduationCap, label: "Réviser avec un quiz", short: "Quiz", onClick: () => onOpenRevision("quiz"), primary: true });
              actions.push({ key: "correction", icon: FileCheck2, label: "Corriger un ancien sujet", short: "Corriger un sujet", onClick: () => onOpenRevision("correction") });
            } else {
              actions.push({ key: "docs", icon: FolderOpen, label: "Ouvrir les documents", short: "Documents", onClick: () => onNavigate("workspace_files"), primary: true });
            }
            if (wording.study && onScan && activeWorkspace) {
              actions.push({ key: "scan", icon: Camera, label: "Photographier un sujet", short: "Photo d’un sujet", onClick: onScan });
            }
            if (!isReader) {
              actions.push({ key: "invite", icon: UserPlus, label: wording.invite, short: "Inviter", onClick: () => void invite() });
            }
            const cols = actions.length >= 4 ? "grid-cols-4" : actions.length === 3 ? "grid-cols-3" : "grid-cols-2";
            return (
              <div className={`grid ${cols} gap-2 sm:flex sm:flex-wrap sm:pt-1`}>
                {actions.map(({ key, icon: Icon, label, short, onClick, primary }) => (
                  <button
                    key={key}
                    onClick={onClick}
                    aria-label={label}
                    className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-center text-[11px] font-medium leading-tight transition sm:min-h-0 sm:flex-row sm:gap-2 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-xs ${
                      primary
                        ? "bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
                        : "border border-zinc-700/70 bg-zinc-900/50 text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 sm:h-3.5 sm:w-3.5" />
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {activeWorkspace && (
        <SpaceNews
          spaceId={activeWorkspace.id}
          userId={user?.id}
          files={files}
          wikiPages={wikiPages}
          onOpenFile={onOpenFile}
          onOpenWiki={onOpenWiki}
        />
      )}

      {library.academic && semesterSubjects.length > 0 && (
        <section className="space-y-3">
          <SectionTitle
            icon={GraduationCap}
            title={`Matières du semestre ${library.current}`}
            action={{ label: "Tout le programme", onClick: () => onNavigate("subjects") }}
          />
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {semesterSubjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                shelf={library.shelves.get(subject.id)}
                onOpen={() => onOpenSubject(subject.id)}
              />
            ))}
          </div>
        </section>
      )}

      {activeWorkspace && !library.academic && canManage && activeWorkspace.icon === "GraduationCap" && (
        <button
          onClick={() => onNavigate("subjects")}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4 text-left transition hover:bg-emerald-400/[0.08]"
        >
          <span>
            <span className="block text-sm font-medium text-zinc-100">Range cet espace par matière</span>
            <span className="mt-0.5 block text-xs text-zinc-400">Indique le niveau de la promo (ITT1, ITT2, ITT3) : Lekki classe les cours et les sujets tout seul.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-emerald-400" />
        </button>
      )}

      {isEmpty ? (
        <section className="rounded-2xl border border-dashed border-zinc-800 p-5 sm:p-8">
          <h2 className="text-sm font-semibold text-zinc-100">{wording.startTitle}</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Upload, title: "Importe un dossier", text: wording.importText, action: () => onNavigate(activeWorkspace ? "workspace_files" : "my_docs"), cta: "Ouvrir les documents" },
              isReader
                ? { icon: Camera, title: "Photographie un sujet", text: "Un ancien sujet sur papier ? Une photo par page, Lekki le lit et le range.", action: () => onScan?.(), cta: "Prendre une photo" }
                : { icon: Users, title: wording.kind === "club" ? "Invite les membres" : "Invite tes camarades", text: wording.inviteText, action: () => void invite(), cta: "Copier le code" },
              wording.study
                ? { icon: GraduationCap, title: "Révise", text: "Questions sourcées, quiz par chapitre, corrections d’anciens sujets.", action: () => onOpenRevision("quiz"), cta: "Essayer" }
                : { icon: Sparkles, title: "Retrouve tout", text: "Pose ta question : Lekki AI répond en citant le document d’où vient l’information.", action: () => onOpenAI(), cta: "Poser une question" },
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
            <StatCard icon={LibraryIcon} tone="text-emerald-400" value={courses.length} title={wording.study ? "Cours & TD" : "Documents"} hint={wording.study ? "Documents de cours" : "Dans cet espace"} onClick={() => onNavigate(activeWorkspace ? "workspace_files" : "my_docs")} />
            {wording.study && (
              <StatCard icon={FileCheck2} tone="text-rose-300" value={exams.length} title="Anciens sujets" hint="Examens, RAT, CC" onClick={() => onOpenRevision("correction")} />
            )}
            <StatCard icon={BookOpen} tone="text-sky-400" value={wikiPages.length} title="Fiches du wiki" hint={`${verifiedCount} vérifiée${verifiedCount > 1 ? "s" : ""}`} onClick={() => onNavigate(activeWorkspace ? "workspace_wiki" : "my_docs")} />
            <StatCard
              icon={Users}
              tone="text-violet-300"
              value={activeWorkspace?.members_count ?? 1}
              title="Membres"
              hint={!activeWorkspace ? "Espace personnel" : isReader ? "Dans cet espace" : "Inviter avec un code"}
              onClick={isReader ? undefined : () => void invite()}
            />
          </div>

          <div className={`grid grid-cols-1 gap-6 ${wording.study ? "lg:grid-cols-2" : ""}`}>
            {wording.study && (<>
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
            </>)}

            {/* Cours et TD récents */}
            <section className="space-y-3">
              <SectionTitle icon={FolderOpen} title={wording.study ? "Cours & TD récents" : "Documents récents"} action={{ label: "Tous les documents", onClick: () => onNavigate(activeWorkspace ? "workspace_files" : "my_docs") }} />
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
                      {wording.study && (
                        <button
                          onClick={() => onOpenRevision("quiz", file.id)}
                          className="shrink-0 rounded-lg border border-zinc-700/70 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-zinc-800"
                        >
                          Quiz
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyCard text="Aucun cours pour l’instant. Importe le dossier de cours de la promo depuis Documents." />
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
}: { icon: React.ElementType; tone: string; value: number; title: string; hint: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-xl border border-zinc-800 bg-[#12151B] p-4 text-left ${onClick ? "transition hover:border-zinc-700 hover:bg-zinc-900/80" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <Icon className={`h-5 w-5 ${tone}`} />
        <span className="font-mono text-sm font-semibold text-zinc-200">{value}</span>
      </div>
      <div className="text-xs font-semibold text-zinc-200">{title}</div>
      <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{hint}</p>
    </Tag>
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
        <button onClick={action.onClick} className="-my-2 flex min-h-10 items-center gap-1 px-1 text-xs text-emerald-400 hover:underline">
          {action.label} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-800 p-5 text-center text-xs leading-relaxed text-zinc-500">{text}</div>;
}
