import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  X, GraduationCap, FileCheck2, Sparkles, LoaderCircle, Check, XCircle, ArrowRight,
  RotateCcw, Search, BookOpen, Eye, ThumbsUp, ThumbsDown, FileText,
} from "lucide-react";
import type { Library, LibraryEntry } from "@/lib/library";
import { revisionApi, QuizQuestion, CorrectionResponse } from "@/lib/api";
import { prettyName } from "@/lib/studentDocs";
import { StudentDocBadge } from "./StudentDocBadge";
import { MarkdownContent } from "./MarkdownContent";

export type RevisionMode = "quiz" | "correction";

interface RevisionPanelProps {
  open: boolean;
  onClose: () => void;
  library: Library;
  spaceName?: string;
  initialMode?: RevisionMode;
  initialFileId?: string | null;
  initialSubjectId?: string | null;
  onOpenDoc: (docId: string) => void;
}

type QuizState =
  | { step: "setup" }
  | { step: "loading" }
  | { step: "play"; questions: QuizQuestion[]; index: number; picked: number | null; revealed: boolean; score: number; degraded: boolean; provider?: string | null }
  | { step: "done"; questions: QuizQuestion[]; score: number };

export function RevisionPanel({
  open, onClose, library, spaceName, initialMode = "quiz", initialFileId, initialSubjectId, onOpenDoc,
}: RevisionPanelProps) {
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [mode, setMode] = useState<RevisionMode>(initialMode);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [focus, setFocus] = useState("");
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState<QuizState>({ step: "setup" });
  const [correctionLoading, setCorrectionLoading] = useState<string | null>(null);
  const [correction, setCorrection] = useState<CorrectionResponse | null>(null);

  // Matières qui ont au moins un document, celles du semestre en cours d'abord.
  const subjectOptions = useMemo(
    () =>
      Array.from(library.shelves.values())
        .filter((shelf) => shelf.courses.length + shelf.exams.length > 0)
        .sort(
          (a, b) =>
            Number(b.subject.semester === library.current) - Number(a.subject.semester === library.current) ||
            a.subject.semester - b.subject.semester ||
            a.subject.title.localeCompare(b.subject.title, "fr")
        ),
    [library]
  );
  const inScope = (entry: LibraryEntry) => !subjectId || entry.subject?.id === subjectId;
  const courses = library.entries.filter((entry) => !entry.info.isExam && entry.info.kind !== "corrige" && inScope(entry));
  const exams = library.entries
    .filter((entry) => entry.info.isExam && inScope(entry))
    .sort((a, b) => (b.info.year || "").localeCompare(a.info.year || "") || a.file.name.localeCompare(b.file.name));
  const subjectTitle = subjectId ? library.shelves.get(subjectId)?.subject.title : undefined;

  // Réinitialise à chaque ouverture, et pré-sélectionne le document demandé.
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setQuiz({ step: "setup" });
    setCorrection(null);
    setFocus("");
    setFilter("");
    setSubjectId(
      initialSubjectId ?? library.entries.find((entry) => entry.file.id === initialFileId)?.subject?.id ?? null
    );
    if (initialFileId && initialMode === "quiz") setSelected([initialFileId]);
    else if (initialSubjectId && initialMode === "quiz")
      // Depuis une page Matière : ses cours sont déjà cochés (5 au plus).
      setSelected((library.shelves.get(initialSubjectId)?.courses || []).slice(0, 5).map((entry) => entry.file.id));
    else setSelected([]);
    if (initialFileId && initialMode === "correction") void runCorrection(initialFileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMode, initialFileId, initialSubjectId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : current.length >= 5 ? current : [...current, id]
    );

  async function startQuiz() {
    if (selected.length === 0) {
      toast.error("Choisis au moins un cours ou un TD.");
      return;
    }
    setQuiz({ step: "loading" });
    try {
      const response = await revisionApi.quiz({ file_ids: selected, count, focus: focus.trim() || undefined });
      if (!response.questions.length) throw new Error("Aucune question n'a pu être générée.");
      setQuiz({
        step: "play", questions: response.questions, index: 0, picked: null, revealed: false, score: 0,
        degraded: response.degraded, provider: response.provider,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de générer le quiz.");
      setQuiz({ step: "setup" });
    }
  }

  async function runCorrection(fileId: string) {
    setCorrection(null);
    setCorrectionLoading(fileId);
    try {
      // Cours et corrigés de la même matière : la correction s'appuie d'abord sur eux.
      const subject = library.entries.find((entry) => entry.file.id === fileId)?.subject;
      const shelf = subject ? library.shelves.get(subject.id) : undefined;
      const references = shelf ? [...shelf.corriges, ...shelf.courses].map((entry) => entry.file.id).slice(0, 12) : [];
      setCorrection(await revisionApi.correction(fileId, references.length ? references : undefined));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de corriger ce sujet.");
    } finally {
      setCorrectionLoading(null);
    }
  }

  const visibleCourses = courses.filter(({ file }) => file.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="revision-title"
        className="flex h-full w-full flex-col overflow-hidden bg-[#14171D] sm:h-[min(760px,92vh)] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-white/[0.09] sm:shadow-[0_24px_100px_rgba(0,0,0,0.55)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-300/10">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="revision-title" className="text-[15px] font-semibold tracking-tight text-zinc-100">Mode révision</h2>
              <p className="mt-0.5 truncate text-xs text-zinc-400">
                Lekki AI t’interroge à partir des documents de {spaceName ? `« ${spaceName} »` : "ton espace"}, et rien d’autre.
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 pt-4 sm:px-6">
          <div className="grid grid-cols-2 rounded-xl bg-black/25 p-1 ring-1 ring-inset ring-white/[0.05]">
            {([
              ["quiz", "S’entraîner (quiz)", Sparkles],
              ["correction", "Corriger un sujet", FileCheck2],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                  mode === value ? "bg-zinc-800 text-zinc-100 shadow-sm ring-1 ring-inset ring-white/[0.07]" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {subjectOptions.length > 0 && !(mode === "quiz" && quiz.step !== "setup") && !correction && !correctionLoading && (
          <div className="flex gap-1.5 overflow-x-auto px-5 pt-3 sm:px-6" role="group" aria-label="Matière">
            <SubjectChip selected={!subjectId} onClick={() => { setSubjectId(null); setSelected([]); }}>
              Toutes les matières
            </SubjectChip>
            {subjectOptions.map(({ subject }) => (
              <SubjectChip
                key={subject.id}
                selected={subjectId === subject.id}
                onClick={() => { setSubjectId(subject.id); setSelected([]); }}
              >
                {subject.title}
              </SubjectChip>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {mode === "quiz" ? (
            <>
              {quiz.step === "setup" && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-zinc-200">1. Sur quoi veux-tu être interrogé ?</p>
                      <span className="text-[11px] tabular-nums text-zinc-500">{selected.length}/5</span>
                    </div>
                    {courses.length > 6 && (
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                        <input
                          value={filter}
                          onChange={(event) => setFilter(event.target.value)}
                          placeholder="Filtrer les documents…"
                          className="w-full rounded-lg border border-white/[0.08] bg-[#0D1015] py-2 pl-8 pr-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-400/50"
                        />
                      </div>
                    )}
                    {courses.length === 0 ? (
                      <EmptyHint
                        text={
                          subjectTitle
                            ? `Aucun cours ni TD pour ${subjectTitle} pour l’instant.`
                            : "Aucun cours ni TD dans cet espace pour l’instant. Importe tes cours depuis Documents."
                        }
                      />
                    ) : (
                      <ul className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1">
                        {visibleCourses.map(({ file, info, subject }) => {
                          const checked = selected.includes(file.id);
                          return (
                            <li key={file.id}>
                              <button
                                type="button"
                                onClick={() => toggle(file.id)}
                                aria-pressed={checked}
                                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                                  checked ? "border-emerald-400/40 bg-emerald-400/[0.07]" : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.14]"
                                }`}
                              >
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-emerald-400 bg-emerald-400 text-zinc-950" : "border-zinc-600"}`}>
                                  {checked && <Check className="h-3 w-3" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs text-zinc-200">{prettyName(file.name)}</span>
                                  {!subjectId && subject && (
                                    <span className="block truncate text-[10px] text-zinc-500">{subject.title}</span>
                                  )}
                                </span>
                                <StudentDocBadge info={info} compact />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                    <label className="space-y-2">
                      <span className="block text-xs font-medium text-zinc-200">2. Un chapitre ou une notion précise ? <span className="font-normal text-zinc-500">(facultatif)</span></span>
                      <input
                        value={focus}
                        onChange={(event) => setFocus(event.target.value)}
                        maxLength={200}
                        placeholder="Ex. théorème de Shannon, formule de Friis…"
                        className="w-full rounded-xl border border-white/[0.09] bg-[#0D1015] px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-400/60"
                      />
                    </label>
                    <div className="space-y-2">
                      <span className="block text-xs font-medium text-zinc-200">3. Combien ?</span>
                      <div className="flex gap-1.5">
                        {[5, 8, 10].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setCount(value)}
                            aria-pressed={count === value}
                            className={`h-[42px] w-12 rounded-xl border text-sm font-medium transition ${
                              count === value ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-white/[0.08] text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {quiz.step === "loading" && (
                <Loading text="Lekki AI lit tes documents et prépare les questions…" />
              )}

              {quiz.step === "play" && (
                <QuizPlayer
                  state={quiz}
                  onPick={(choice) => {
                    if (quiz.revealed) return;
                    const correct = choice === quiz.questions[quiz.index].answer_index;
                    setQuiz({ ...quiz, picked: choice, revealed: true, score: quiz.score + (correct ? 1 : 0) });
                  }}
                  onReveal={() => setQuiz({ ...quiz, revealed: true })}
                  onSelfAssess={(knew) => {
                    const next = { ...quiz, score: quiz.score + (knew ? 1 : 0) };
                    advance(next);
                  }}
                  onNext={() => advance(quiz)}
                />
              )}

              {quiz.step === "done" && (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl font-bold text-emerald-300 ring-1 ring-inset ring-emerald-300/15">
                    {quiz.score}/{quiz.questions.length}
                  </div>
                  <p className="max-w-sm text-sm text-zinc-300">
                    {quiz.score === quiz.questions.length
                      ? "Sans faute. Tu peux passer à un ancien sujet."
                      : quiz.score >= quiz.questions.length / 2
                        ? "Bien. Relis les explications des questions manquées, puis recommence."
                        : "Il y a des notions à revoir. Rouvre le cours, puis refais le quiz."}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button onClick={() => void startQuiz()} className="inline-flex items-center gap-2 rounded-lg border border-white/[0.09] px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.05]">
                      <RotateCcw className="h-3.5 w-3.5" /> Nouvelles questions
                    </button>
                    <button onClick={() => setMode("correction")} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">
                      <FileCheck2 className="h-3.5 w-3.5" /> Passer à un ancien sujet
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <CorrectionView
              exams={exams}
              loadingId={correctionLoading}
              result={correction}
              onPick={(id) => void runCorrection(id)}
              onBack={() => setCorrection(null)}
              onOpenDoc={onOpenDoc}
            />
          )}
        </div>

        {mode === "quiz" && quiz.step === "setup" && (
          <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-black/15 px-5 py-4 sm:px-6">
            <p className="hidden text-[11px] text-zinc-500 sm:block">Chaque réponse est justifiée par le document d’origine.</p>
            <button
              onClick={() => void startQuiz()}
              disabled={selected.length === 0}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Sparkles className="h-3.5 w-3.5" /> Lancer le quiz
            </button>
          </footer>
        )}
      </section>
    </div>
  );

  function advance(state: Extract<QuizState, { step: "play" }>) {
    if (state.index + 1 >= state.questions.length) {
      setQuiz({ step: "done", questions: state.questions, score: state.score });
    } else {
      setQuiz({ ...state, index: state.index + 1, picked: null, revealed: false });
    }
  }
}

function QuizPlayer({
  state, onPick, onReveal, onSelfAssess, onNext,
}: {
  state: Extract<QuizState, { step: "play" }>;
  onPick: (choice: number) => void;
  onReveal: () => void;
  onSelfAssess: (knew: boolean) => void;
  onNext: () => void;
}) {
  const question = state.questions[state.index];
  const isFlashcard = question.choices.length === 0;
  const last = state.index + 1 >= state.questions.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
        <span>Question {state.index + 1} sur {state.questions.length}</span>
        <span className="truncate">{state.degraded ? "Fiches générées sans IA" : state.provider ? `Généré par ${state.provider}` : ""}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(state.index / state.questions.length) * 100}%` }} />
      </div>

      <h3 className="text-base font-semibold leading-snug text-zinc-100">{question.question}</h3>

      {isFlashcard ? (
        state.revealed ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4 text-sm leading-relaxed text-zinc-200">
            {question.answer}
          </div>
        ) : (
          <button onClick={onReveal} className="inline-flex items-center gap-2 rounded-lg border border-white/[0.09] px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.05]">
            <Eye className="h-3.5 w-3.5" /> Réfléchis, puis affiche la réponse
          </button>
        )
      ) : (
        <ul className="space-y-2">
          {question.choices.map((choice, index) => {
            const isAnswer = index === question.answer_index;
            const isPicked = index === state.picked;
            const tone = !state.revealed
              ? "border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.03]"
              : isAnswer
                ? "border-emerald-400/50 bg-emerald-400/[0.08]"
                : isPicked
                  ? "border-rose-400/50 bg-rose-400/[0.08]"
                  : "border-white/[0.05] opacity-60";
            return (
              <li key={index}>
                <button
                  onClick={() => onPick(index)}
                  disabled={state.revealed}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm text-zinc-200 transition ${tone}`}
                >
                  <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[11px] font-semibold text-zinc-400">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{choice}</span>
                  {state.revealed && isAnswer && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
                  {state.revealed && isPicked && !isAnswer && <XCircle className="h-4 w-4 shrink-0 text-rose-400" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {state.revealed && (question.explanation || question.source_title) && !isFlashcard && (
        <div className="rounded-xl bg-black/25 p-4 text-xs leading-relaxed text-zinc-300 ring-1 ring-inset ring-white/[0.05]">
          {question.explanation && <p>{question.explanation}</p>}
          {question.source_title && (
            <p className="mt-2 flex items-center gap-1.5 text-zinc-500">
              <BookOpen className="h-3 w-3" /> Source : {prettyName(question.source_title)}
            </p>
          )}
        </div>
      )}
      {state.revealed && isFlashcard && question.source_title && (
        <p className="flex items-center gap-1.5 text-xs text-zinc-500"><BookOpen className="h-3 w-3" /> Source : {prettyName(question.source_title)}</p>
      )}

      {state.revealed && (
        <div className="flex justify-end gap-2">
          {isFlashcard ? (
            <>
              <button onClick={() => onSelfAssess(false)} className="inline-flex items-center gap-2 rounded-lg border border-white/[0.09] px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.05]">
                <ThumbsDown className="h-3.5 w-3.5" /> À revoir
              </button>
              <button onClick={() => onSelfAssess(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">
                <ThumbsUp className="h-3.5 w-3.5" /> Je savais
              </button>
            </>
          ) : (
            <button onClick={onNext} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">
              {last ? "Voir mon score" : "Question suivante"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CorrectionView({
  exams, loadingId, result, onPick, onBack, onOpenDoc,
}: {
  exams: LibraryEntry[];
  loadingId: string | null;
  result: CorrectionResponse | null;
  onPick: (id: string) => void;
  onBack: () => void;
  onOpenDoc: (id: string) => void;
}) {
  if (loadingId) return <Loading text="Lekki AI lit le sujet et cherche les passages de cours utiles…" />;

  if (result) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Correction proposée</p>
            <h3 className="truncate text-sm font-semibold text-zinc-100">{prettyName(result.subject_title)}</h3>
          </div>
          <button onClick={onBack} className="text-xs text-emerald-400 hover:underline">Choisir un autre sujet</button>
        </div>
        {result.degraded && (
          <p className="rounded-lg bg-amber-400/[0.07] px-3 py-2 text-xs text-amber-200 ring-1 ring-inset ring-amber-300/15">
            L’IA ne répond pas en ce moment : voici les passages de cours liés à chaque question.
          </p>
        )}
        <div className="rounded-xl bg-black/20 p-4 ring-1 ring-inset ring-white/[0.05] sm:p-5">
          <MarkdownContent content={result.answer} className="text-sm" />
        </div>
        {result.sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300">Cours utilisés</p>
            {result.sources.map((source) => (
              <button
                key={source.id}
                onClick={() => onOpenDoc(source.id)}
                className="flex w-full items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 text-left transition hover:border-white/[0.14]"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-zinc-200">{prettyName(source.title)}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[11px] text-zinc-500">{source.excerpt}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-zinc-600">
          Une correction proposée par l’IA peut contenir des erreurs : vérifie-la avec le cours et ton enseignant.
          {result.provider ? ` · ${result.provider}` : ""}
        </p>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <EmptyHint text="Aucun ancien sujet détecté. Lekki reconnaît les fichiers nommés comme « TS_Examen_CL_2024 », « RAT », « CC » ou rangés dans un dossier SUJETS." />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">Choisis un ancien sujet : Lekki AI propose une correction appuyée sur les cours de l’espace.</p>
      <ul className="space-y-1.5">
        {exams.map(({ file, info, subject }) => (
          <li key={file.id}>
            <button
              onClick={() => onPick(file.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-3 text-left transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.04]"
            >
              <FileCheck2 className="h-4 w-4 shrink-0 text-rose-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-zinc-200">{prettyName(file.name)}</span>
                {subject && <span className="block truncate text-[10px] text-zinc-500">{subject.title}</span>}
              </span>
              <StudentDocBadge info={info} />
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubjectChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
        selected ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-white/[0.08] text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <LoaderCircle className="h-6 w-6 animate-spin text-emerald-400" />
      <p className="max-w-xs text-sm text-zinc-400">{text}</p>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs leading-relaxed text-zinc-500">{text}</div>
  );
}
