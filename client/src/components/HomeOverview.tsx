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
  Plus,
  StickyNote,
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

  const isEmpty = spaceFiles.length === 0 && wikiPages.length === 0;
  const wording = spaceWording(activeWorkspace);
  const semesterSubjects = library.current ? library.subjectsOfSemester(library.current) : [];
  const canManage = ["owner", "admin"].includes(activeWorkspace?.role || "");
  const isReader = Boolean(activeWorkspace) && !canManage;

  return (
    <div id="home-overview-container" className="flex-1 overflow-y-auto bg-[#FBFAF6]">
      {/* ── Hero façon NotebookLM : centré, question en grand ── */}
      <section className="relative overflow-hidden bg-ink px-4 pt-12 pb-10 sm:px-8 sm:pt-20 sm:pb-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72">
          <div className="absolute left-1/2 top-[-8rem] h-56 w-[44rem] -translate-x-1/2 rounded-full bg-[#D6E8D7]/40 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p className="eyebrow flex items-center justify-center gap-2 text-[#2E7D5B]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{firstName ? `Bonjour ${firstName}` : "Bonjour"}</span>
            <span className="h-1 w-1 rounded-full bg-[#8A968E]" />
            <span className="truncate normal-case tracking-normal text-[11px] font-medium text-[#5C6B62]">
              {activeWorkspace ? activeWorkspace.name : "Mon espace"}
              {library.academic && library.current ? ` · S${library.current}` : ""}
            </span>
          </p>

          <h1 className="display-title mt-5 text-[2rem] leading-[1.15] text-[#16241D] sm:text-[2.75rem]">
            {wording.headline[0]}{" "}
            <em className="whitespace-nowrap not-italic text-[#2E7D5B]">
              {wording.headline[1].replace(" ?", "\u00a0?")}
            </em>
          </h1>

          {/* Barre de question principale, façon NotebookLM */}
          <form
            onSubmit={submit}
            className="mx-auto mt-7 flex max-w-2xl items-center gap-2 rounded-[1.25rem] border border-[#D9DFD2] bg-white p-2 pl-5 shadow-[0_1px_6px_rgba(60,64,67,0.08)] transition focus-within:border-[#2E7D5B]/40 focus-within:shadow-[0_2px_12px_rgba(26,115,232,0.12)]"
          >
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={wording.askPlaceholder}
              aria-label="Question pour Lekki"
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-[#16241D] outline-none placeholder:text-[#8A968E]"
            />
            <button
              type="submit"
              disabled={!question.trim()}
              aria-label="Demander à Lekki"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-[#2E7D5B] text-white transition hover:bg-[#246147] disabled:bg-[#D9DFD2] disabled:text-[#8A968E]"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </form>

          {/* Suggestions : cartes cliquables, façon NotebookLM */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onAsk(suggestion)}
                className="rounded-full border border-[#D9DFD2] bg-white px-3.5 py-1.5 text-[13px] text-[#3E4641] transition hover:border-[#2E7D5B]/30 hover:bg-[#F5F8F3] hover:text-[#2E7D5B]"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Actions rapides : tuiles façon NotebookLM */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {(() => {
              const actions: { key: string; icon: React.ElementType; label: string; onClick: () => void; primary?: boolean }[] = [];
              if (wording.study) {
                actions.push({ key: "quiz", icon: GraduationCap, label: "Réviser avec un quiz", onClick: () => onOpenRevision("quiz"), primary: true });
                actions.push({ key: "correction", icon: FileCheck2, label: "Corriger un sujet", onClick: () => onOpenRevision("correction") });
              } else {
                actions.push({ key: "docs", icon: FolderOpen, label: "Ouvrir les documents", onClick: () => onNavigate("workspace_files"), primary: true });
              }
              if (wording.study && onScan && activeWorkspace) {
                actions.push({ key: "scan", icon: Camera, label: "Photo d’un sujet", onClick: onScan });
              }
              if (!isReader) {
                actions.push({ key: "invite", icon: UserPlus, label: wording.invite, onClick: () => void invite() });
              }
              return actions.map(({ key, icon: Icon, label, onClick, primary }) => (
                <button
                  key={key}
                  onClick={onClick}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition ${
                    primary
                      ? "bg-[#2E7D5B] text-white hover:bg-[#246147]"
                      : "border border-[#D9DFD2] bg-white text-[#3E4641] hover:border-[#2E7D5B]/30 hover:bg-[#F5F8F3] hover:text-[#2E7D5B]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ));
            })()}
          </div>
        </div>
      </section>

      {/* ── Contenu : cartes blanches sur fond gris clair ── */}
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8 sm:space-y-8">
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#2E7D5B]/20 bg-[#F5F8F3] p-4 text-left transition hover:bg-[#EAF2E9]"
          >
            <span>
              <span className="block text-sm font-medium text-[#16241D]">Range cet espace par matière</span>
              <span className="mt-0.5 block text-xs text-[#5C6B62]">Indique le niveau de la promo (ITT1, ITT2, ITT3) : Lekki classe les cours et les sujets tout seul.</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#2E7D5B]" />
          </button>
        )}

        {isEmpty ? (
          <section className="rounded-2xl border border-dashed border-[#D9DFD2] bg-white p-6 sm:p-10">
            <h2 className="text-base font-medium text-[#16241D]">{wording.startTitle}</h2>
            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Upload, title: "Importe un dossier", text: wording.importText, action: () => onNavigate(activeWorkspace ? "workspace_files" : "my_docs"), cta: "Ouvrir les documents" },
                isReader
                  ? { icon: Camera, title: "Photographie un sujet", text: "Un ancien sujet sur papier ? Une photo par page, Lekki le lit et le range.", action: () => onScan?.(), cta: "Prendre une photo" }
                  : { icon: Users, title: wording.kind === "club" ? "Invite les membres" : "Invite tes camarades", text: wording.inviteText, action: () => void invite(), cta: "Copier le code" },
                wording.study
                  ? { icon: GraduationCap, title: "Révise", text: "Questions sourcées, quiz par chapitre, corrections d’anciens sujets.", action: () => onOpenRevision("quiz"), cta: "Essayer" }
                  : { icon: Sparkles, title: "Retrouve tout", text: "Pose ta question : Lekki AI répond en citant le document d’où vient l’information.", action: () => onOpenAI(), cta: "Poser une question" },
              ].map(({ icon: Icon, title, text, action, cta }, index) => (
                <li key={title} className="rounded-2xl bg-[#FBFAF6] p-5 ring-1 ring-inset ring-[#E5E9DC]">
                  <div className="flex items-center gap-2 text-[#2E7D5B]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2E7D5B]/10 text-[11px] font-bold">{index + 1}</span>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-[#16241D]">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#5C6B62]">{text}</p>
                  <button onClick={action} className="mt-3 inline-flex items-center gap-1 text-xs text-[#2E7D5B] hover:underline">
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
              <StatCard icon={LibraryIcon} tone="text-[#2E7D5B]" value={courses.length} title={wording.study ? "Cours & TD" : "Documents"} hint={wording.study ? "Documents de cours" : "Dans cet espace"} onClick={() => onNavigate(activeWorkspace ? "workspace_files" : "my_docs")} />
              {wording.study && (
                <StatCard icon={FileCheck2} tone="text-[#d93025]" value={exams.length} title="Anciens sujets" hint="Examens, RAT, CC" onClick={() => onOpenRevision("correction")} />
              )}
              <StatCard icon={BookOpen} tone="text-[#2E7D5B]" value={wikiPages.length} title="Fiches du wiki" hint={`${verifiedCount} vérifiée${verifiedCount > 1 ? "s" : ""}`} onClick={() => onNavigate(activeWorkspace ? "workspace_wiki" : "my_docs")} />
              <StatCard
                icon={Users}
                tone="text-[#2E7D5B]"
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
                      <li key={file.id} className="flex items-center gap-3 rounded-2xl border border-[#E5E9DC] bg-white p-3 transition hover:border-[#D9DFD2] hover:shadow-[0_1px_3px_rgba(60,64,67,0.08)]">
                        <button onClick={() => onOpenFile(file)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                          <span className="rounded-lg bg-[#F1F0E9] p-1.5 ring-1 ring-inset ring-[#E5E9DC]">
                            <DocumentTypeIcon extension={file.extension} className="h-5 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium text-[#16241D]">{prettyName(file.name)}</span>
                            <span className="mt-1 block"><StudentDocBadge info={info} /></span>
                          </span>
                        </button>
                        <button
                          onClick={() => onOpenRevision("correction", file.id)}
                          className="shrink-0 rounded-full border border-[#2E7D5B]/25 px-3 py-1.5 text-[11px] font-medium text-[#2E7D5B] transition hover:bg-[#2E7D5B]/10"
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
                      <li key={file.id} className="flex items-center gap-3 rounded-2xl border border-[#E5E9DC] bg-white p-3 transition hover:border-[#D9DFD2] hover:shadow-[0_1px_3px_rgba(60,64,67,0.08)]">
                        <button onClick={() => onOpenFile(file)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                          <span className="rounded-lg bg-[#F1F0E9] p-1.5 ring-1 ring-inset ring-[#E5E9DC]">
                            <DocumentTypeIcon extension={file.extension} className="h-5 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium text-[#16241D]">{prettyName(file.name)}</span>
                            <span className="mt-1 block"><StudentDocBadge info={info} compact /></span>
                          </span>
                        </button>
                        {wording.study && (
                          <button
                            onClick={() => onOpenRevision("quiz", file.id)}
                            className="shrink-0 rounded-full border border-[#D9DFD2] px-3 py-1.5 text-[11px] font-medium text-[#3E4641] transition hover:bg-[#F1F0E9]"
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
                        className="w-full rounded-2xl border border-[#E5E9DC] bg-white p-4 text-left transition hover:border-[#D9DFD2] hover:shadow-[0_1px_3px_rgba(60,64,67,0.08)]"
                      >
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-[#16241D]">{page.title}</span>
                          {page.status === "verified" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#2E7D5B]" aria-label="Vérifiée" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 shrink-0 text-[#f9ab00]" aria-label="Non vérifiée" />
                          )}
                        </span>
                        <span className="mt-1.5 block line-clamp-2 text-[12px] leading-relaxed text-[#5C6B62]">
                          {page.section && page.section !== "Général" ? `${page.section} · ` : ""}
                          {page.content.replace(/[#*`_>]/g, "").replace(page.title, "").trim().slice(0, 120)}
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
      className={`rounded-2xl border border-[#E5E9DC] bg-white p-4 text-left transition ${onClick ? "hover:border-[#D9DFD2] hover:shadow-[0_1px_3px_rgba(60,64,67,0.08)]" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <Icon className={`h-5 w-5 ${tone}`} />
        <span className="font-display text-xl leading-none text-[#16241D]">{value}</span>
      </div>
      <div className="text-xs font-medium text-[#16241D]">{title}</div>
      <p className="mt-0.5 line-clamp-1 text-[11px] text-[#5C6B62]">{hint}</p>
    </Tag>
  );
}

function SectionTitle({
  icon: Icon, title, action,
}: { icon: React.ElementType; title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-[13px] font-medium text-[#16241D]">
        <Icon className="h-4 w-4 text-[#2E7D5B]" /> {title}
      </h2>
      {action && (
        <button onClick={action.onClick} className="-my-2 flex min-h-10 items-center gap-1 px-1 text-xs text-[#2E7D5B] hover:underline">
          {action.label} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-[#D9DFD2] bg-white p-6 text-center text-xs leading-relaxed text-[#5C6B62]">{text}</div>;
}
