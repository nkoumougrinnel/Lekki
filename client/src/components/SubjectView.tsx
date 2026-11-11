import React, { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowUp, BookOpen, FileCheck2, GraduationCap, Library as LibraryIcon, PenLine, Camera, Sparkles, CheckCircle2,
  Clock, FileText,
} from "lucide-react";
import type { DriveFile, WikiPage } from "@/types/lekki";
import type { LibraryEntry, SubjectShelf } from "@/lib/library";
import { prettyName } from "@/lib/studentDocs";
import type { RevisionMode } from "./RevisionPanel";
import { DocumentTypeIcon } from "./DocumentTypeIcon";
import { StudentDocBadge } from "./StudentDocBadge";

const UE_CATEGORY: Record<string, string> = {
  fondamentale: "UE fondamentale",
  optionnelle: "UE optionnelle",
  transversale: "UE transversale",
};

interface SubjectViewProps {
  shelf: SubjectShelf;
  onBack: () => void;
  onOpenFile: (file: DriveFile) => void;
  onOpenWiki: (page: WikiPage) => void;
  onAsk: (question: string) => void;
  onOpenRevision: (mode: RevisionMode, fileId?: string, subjectId?: string) => void;
  onWriteNote: () => void;
  onAddDocuments: () => void;
  /** Photographier un sujet papier de cette matière. */
  onScan?: () => void;
}

/** Une matière : ses cours, ses anciens sujets, ses fiches, et la révision ciblée. */
export function SubjectView({
  shelf, onBack, onOpenFile, onOpenWiki, onAsk, onOpenRevision, onWriteNote, onAddDocuments, onScan,
}: SubjectViewProps) {
  const { subject, courses, exams, corriges, wiki } = shelf;
  const [question, setQuestion] = useState("");
  const examsByYear = useMemo(() => {
    const groups = new Map<string, LibraryEntry[]>();
    exams.forEach((entry) => {
      const key = entry.info.year || "Sans année";
      groups.set(key, [...(groups.get(key) || []), entry]);
    });
    return Array.from(groups.entries());
  }, [exams]);
  const isEmpty = courses.length + exams.length + corriges.length + wiki.length === 0;

  const ask = (event: React.FormEvent) => {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    // Le nom de la matière oriente la recherche de Lekki AI vers les bons documents.
    onAsk(`${value} (matière : ${subject.title})`);
    setQuestion("");
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto bg-[#0E1116] p-4 sm:p-8">
      <button onClick={onBack} className="-my-2 inline-flex min-h-10 items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 sm:text-xs">
        <ArrowLeft className="h-3.5 w-3.5" /> Matières
      </button>

      <section className="relative space-y-4 overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-[#141820] via-[#161B24] to-[#12151B] p-5 sm:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 -translate-y-10 translate-x-10 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative space-y-1">
          <p className="font-mono text-[11px] text-zinc-500">
            S{subject.semester} · {subject.ue.code}
            {subject.code ? ` · ${subject.code}` : ""} · {UE_CATEGORY[subject.ue.category]} · {subject.ue.credits} crédits
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">{subject.title}</h1>
        </div>

        <form onSubmit={ask} className="relative max-w-2xl">
          <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={`Une question sur ${subject.title} ?`}
            aria-label={`Question sur ${subject.title}`}
            className="w-full rounded-xl border border-zinc-700/70 bg-[#0D1015]/90 py-3 pl-11 pr-14 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/60"
          />
          <button
            type="submit"
            disabled={!question.trim()}
            aria-label="Demander à Lekki AI"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>

        <div className="relative flex flex-wrap gap-2">
          <ActionButton primary icon={GraduationCap} disabled={courses.length === 0} onClick={() => onOpenRevision("quiz", undefined, subject.id)}>
            Quiz sur la matière
          </ActionButton>
          <ActionButton icon={FileCheck2} disabled={exams.length === 0} onClick={() => onOpenRevision("correction", undefined, subject.id)}>
            Corriger un sujet
          </ActionButton>
          {onScan && (
            <ActionButton icon={Camera} onClick={onScan}>
              Photographier un sujet
            </ActionButton>
          )}
          <ActionButton icon={PenLine} onClick={onWriteNote}>
            Écrire une fiche
          </ActionButton>
        </div>
      </section>

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center">
          <p className="text-sm text-zinc-300">Aucun document pour {subject.title}.</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
            Importe le dossier de la matière, ou nomme les fichiers avec l’abréviation de la matière
            (ex. « {subject.ec.aliases?.[0]?.toUpperCase() || "TS"}_Examen_CL_2024 »).
          </p>
          <button onClick={onAddDocuments} className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline">
            Ajouter des documents
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <SectionTitle icon={FileCheck2} title={`Anciens sujets (${exams.length})`} />
            {exams.length === 0 ? (
              <Muted text="Aucun ancien sujet pour l’instant." />
            ) : (
              <div className="space-y-4">
                {examsByYear.map(([year, entries]) => (
                  <div key={year} className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-zinc-500">{year}</p>
                    {entries.map((entry) => (
                      <Row
                        key={entry.file.id}
                        entry={entry}
                        onOpen={() => onOpenFile(entry.file)}
                        action={{ label: "Corriger", onClick: () => onOpenRevision("correction", entry.file.id, subject.id) }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <SectionTitle icon={LibraryIcon} title={`Cours, TD et TP (${courses.length})`} />
            {courses.length === 0 ? (
              <Muted text="Aucun cours pour l’instant." />
            ) : (
              <div className="space-y-1.5">
                {courses.map((entry) => (
                  <Row
                    key={entry.file.id}
                    entry={entry}
                    onOpen={() => onOpenFile(entry.file)}
                    action={{ label: "Quiz", onClick: () => onOpenRevision("quiz", entry.file.id, subject.id) }}
                  />
                ))}
              </div>
            )}

            {(corriges.length > 0 || wiki.length > 0) && (
              <div className="space-y-1.5 pt-3">
                <SectionTitle icon={BookOpen} title={`Corrigés et fiches (${corriges.length + wiki.length})`} />
                {corriges.map((entry) => (
                  <Row key={entry.file.id} entry={entry} onOpen={() => onOpenFile(entry.file)} />
                ))}
                {wiki.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => onOpenWiki(page)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-800 bg-[#12151B] p-3 text-left transition hover:border-zinc-700"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-sky-400" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-200">{page.title}</span>
                    {page.status === "verified" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-label="Fiche vérifiée" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-label="Fiche non vérifiée" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Row({
  entry, onOpen, action,
}: { entry: LibraryEntry; onOpen: () => void; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#12151B] p-2.5 transition hover:border-zinc-700">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className="shrink-0 rounded bg-zinc-800 p-1.5 ring-1 ring-zinc-700/60">
          <DocumentTypeIcon extension={entry.file.extension} className="h-4 w-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-zinc-200">{prettyName(entry.file.name)}</span>
          <span className="mt-1 block"><StudentDocBadge info={entry.info} /></span>
        </span>
      </button>
      {action && (
        <button
          onClick={action.onClick}
          className="min-h-10 shrink-0 rounded-lg border border-zinc-700/70 px-3 py-1.5 text-xs sm:min-h-0 sm:px-2.5 sm:text-[11px] font-medium text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-200"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon, children, onClick, primary = false, disabled = false,
}: { icon: React.ElementType; children: React.ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? "bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
          : "border border-zinc-700/70 bg-zinc-900/50 font-medium text-zinc-200 hover:bg-zinc-800"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
      <Icon className="h-4 w-4 text-emerald-400" /> {title}
    </h2>
  );
}

function Muted({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">{text}</p>;
}
