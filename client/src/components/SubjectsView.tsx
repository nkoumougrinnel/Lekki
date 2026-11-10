import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BookOpen, FileCheck2, GraduationCap, HelpCircle, Library as LibraryIcon } from "lucide-react";
import type { DriveFile, Workspace } from "@/types/lekki";
import type { Library, SubjectShelf } from "@/lib/library";
import { AcademicInfo, PROGRAMS, Subject, academicLabel, subjectsOf } from "@/lib/curriculum";
import { prettyName } from "@/lib/studentDocs";
import { workspaces as workspacesApi } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AcademicFields } from "./AcademicFields";
import { StudentDocBadge } from "./StudentDocBadge";

const UE_CATEGORY: Record<string, string> = {
  fondamentale: "UE fondamentale",
  optionnelle: "UE optionnelle",
  transversale: "UE transversale",
};

interface SubjectsViewProps {
  library: Library;
  workspace: Workspace | null;
  onOpenSubject: (subjectId: string) => void;
  onOpenFile: (file: DriveFile) => void;
}

/** Le programme de la promo : semestres → UE → matières, avec ce que l'espace contient pour chacune. */
export function SubjectsView({ library, workspace, onOpenSubject, onOpenFile }: SubjectsViewProps) {
  const [semester, setSemester] = useState<number>(library.current ?? 1);
  useEffect(() => {
    if (library.current) setSemester(library.current);
  }, [library.current, workspace?.id]);

  if (!workspace) {
    return (
      <Shell>
        <Empty text="Rejoins ou crée l’espace de ta promo pour voir ses matières." />
      </Shell>
    );
  }
  if (!library.academic) return <AcademicSetup workspace={workspace} />;

  const program = PROGRAMS[0];
  const plan = subjectsOf(semester, library.academic.specialty, false);
  const ues = Array.from(new Map(plan.map((subject) => [subject.ue.code, subject.ue])).values());

  return (
    <Shell>
      <header className="space-y-1">
        <p className="text-xs font-medium text-emerald-300/90">
          {program.school} · {academicLabel(library.academic)} · {program.source}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Matières</h1>
        <p className="text-sm text-zinc-400">
          Chaque document est rangé sous sa matière d’après son nom ou son dossier.
        </p>
      </header>

      <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Semestres">
        {[1, 2, 3, 4, 5, 6].map((value) => {
          const ofPromo = library.semesters.includes(value);
          return (
            <button
              key={value}
              onClick={() => setSemester(value)}
              aria-pressed={semester === value}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                semester === value
                  ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                  : ofPromo
                    ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              S{value}
              {value === library.current && <span className="ml-1.5 text-[10px] text-emerald-400">· en cours</span>}
            </button>
          );
        })}
      </nav>

      <div className="space-y-6">
        {ues.map((ue) => (
          <section key={ue.code} className="space-y-2.5">
            <h2 className="flex flex-wrap items-baseline gap-x-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span className="text-zinc-200">{ue.code}</span>
              <span className="font-normal normal-case tracking-normal text-zinc-500">
                {UE_CATEGORY[ue.category]} · {ue.credits} crédits
              </span>
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {plan
                .filter((subject) => subject.ue.code === ue.code)
                .map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    shelf={library.shelves.get(subject.id)}
                    onOpen={() => onOpenSubject(subject.id)}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>

      {library.unmatched.length > 0 && (
        <section className="space-y-2.5 rounded-2xl border border-dashed border-zinc-800 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <HelpCircle className="h-4 w-4 text-zinc-500" /> Documents sans matière ({library.unmatched.length})
          </h2>
          <p className="text-xs leading-relaxed text-zinc-500">
            Lekki reconnaît la matière par le nom du fichier (« TS_Examen_CL_2024 », « Antennes_TD_1 ») ou par
            son dossier (« TRAITEMENT DU SIGNAL »). Renomme ou déplace ceux-ci pour qu’ils rejoignent leur matière.
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {library.unmatched.slice(0, 10).map(({ file, info }) => (
              <li key={file.id}>
                <button
                  onClick={() => onOpenFile(file)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-900"
                >
                  <span className="min-w-0 flex-1 truncate">{prettyName(file.name)}</span>
                  <StudentDocBadge info={info} compact />
                </button>
              </li>
            ))}
          </ul>
          {library.unmatched.length > 10 && (
            <p className="text-[11px] text-zinc-600">… et {library.unmatched.length - 10} autres, visibles dans le Drive.</p>
          )}
        </section>
      )}
    </Shell>
  );
}

export function SubjectCard({ subject, shelf, onOpen }: { subject: Subject; shelf?: SubjectShelf; onOpen: () => void }) {
  const courses = shelf?.courses.length ?? 0;
  const exams = shelf?.exams.length ?? 0;
  const notes = (shelf?.wiki.length ?? 0) + (shelf?.corriges.length ?? 0);
  const empty = courses + exams + notes === 0;
  return (
    <button
      onClick={onOpen}
      className={`group flex h-full flex-col rounded-xl border p-4 text-left transition ${
        empty ? "border-zinc-800/70 bg-[#101318]" : "border-zinc-800 bg-[#12151B] hover:border-emerald-400/30"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold text-zinc-500">{subject.code ?? subject.ue.code}</span>
        <ArrowRight className="h-3.5 w-3.5 text-zinc-700 transition group-hover:translate-x-0.5 group-hover:text-emerald-400" />
      </span>
      <span className={`mt-1.5 text-sm font-semibold leading-snug ${empty ? "text-zinc-400" : "text-zinc-100"}`}>
        {subject.title}
      </span>
      <span className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-[11px] text-zinc-500">
        {empty ? (
          <span>Aucun document pour l’instant</span>
        ) : (
          <>
            <Count icon={LibraryIcon} value={courses} label="cours & TD" tone="text-emerald-400" />
            <Count icon={FileCheck2} value={exams} label={exams > 1 ? "sujets" : "sujet"} tone="text-rose-300" />
            {notes > 0 && <Count icon={BookOpen} value={notes} label={notes > 1 ? "fiches" : "fiche"} tone="text-sky-400" />}
          </>
        )}
      </span>
    </button>
  );
}

function Count({ icon: Icon, value, label, tone }: { icon: React.ElementType; value: number; label: string; tone: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={`h-3 w-3 ${value ? tone : "text-zinc-700"}`} />
      <span className={value ? "text-zinc-300" : ""}>{value}</span> {label}
    </span>
  );
}

function AcademicSetup({ workspace }: { workspace: Workspace }) {
  const { refresh } = useWorkspace();
  const [value, setValue] = useState<AcademicInfo | null>({ program: "supptic-itt", level: 2, specialty: null });
  const [saving, setSaving] = useState(false);
  const canManage = ["owner", "admin"].includes(workspace.role || "");

  const save = async () => {
    if (!value) return;
    setSaving(true);
    try {
      await workspacesApi.update(workspace.id, { academic: value });
      await refresh();
      toast.success("Programme enregistré : les documents sont rangés par matière.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer le programme.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-xl space-y-5 rounded-2xl border border-zinc-800 bg-[#12151B] p-5 sm:p-7">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Quel programme suit « {workspace.name} » ?</h1>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Avec le programme, Lekki range chaque cours, TD et ancien sujet sous sa matière, et la révision
              se fait matière par matière.
            </p>
          </div>
        </div>
        {canManage ? (
          <>
            <AcademicFields value={value} onChange={setValue} allowNone={false} />
            <div className="flex justify-end">
              <button
                onClick={() => void save()}
                disabled={!value || saving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-45"
              >
                {saving ? "Enregistrement…" : "Ranger par matière"}
              </button>
            </div>
          </>
        ) : (
          <p className="rounded-lg bg-black/20 p-3 text-xs text-zinc-400">
            Demande à un admin de l’espace de choisir le programme (menu Administration).
          </p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 space-y-6 overflow-y-auto bg-[#0E1116] p-4 sm:p-8">{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">{text}</div>;
}
