import { useEffect, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuizRunner({ questions }) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setIndex(0);
    setChoice(null);
    setChecked(false);
    setScore(0);
    setDone(false);
  }, [questions]);

  if (!questions.length) {
    return <p className="text-sm text-[#8A968E]">Aucune question générée.</p>;
  }

  if (done) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-2xl border border-[#E7E4D9] bg-white px-6 py-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF2E7] text-[#2E7D5B]">
          <Trophy className="h-6 w-6" />
        </span>
        <p className="mt-4 font-heading text-2xl font-semibold text-[#16241D]">
          {score} / {questions.length}
        </p>
        <p className="mt-1 text-sm text-[#5C6B62]">
          {percent >= 80
            ? "Excellent — tu peux passer à un autre chapitre."
            : percent >= 50
              ? "Bonne base : relis les explications des questions manquées."
              : "À retravailler : relis la fiche puis refais le quiz."}
        </p>
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setChoice(null);
            setChecked(false);
            setScore(0);
            setDone(false);
          }}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#16241D] px-5 py-2.5 text-[12.5px] font-semibold text-[#FBFAF6] transition-colors hover:bg-[#24382D]"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Refaire le quiz
        </button>
      </div>
    );
  }

  const question = questions[index];
  const options = Array.isArray(question.options) ? question.options : [];
  const correct = Number(question.answer_index) || 0;

  const check = () => {
    if (choice === null) return;
    setChecked(true);
    if (choice === correct) setScore((value) => value + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex((value) => value + 1);
    setChoice(null);
    setChecked(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-[#8A968E]">
        <span>
          Question {index + 1} sur {questions.length}
        </span>
        <span>{score} bonne{score > 1 ? "s" : ""} réponse{score > 1 ? "s" : ""}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#F1EFE6]">
        <div
          className="h-full rounded-full bg-[#2E7D5B] transition-all duration-500"
          style={{ width: `${((index + (checked ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <h3 className="mt-5 font-heading text-[1.05rem] font-semibold leading-snug text-[#16241D]">
        {question.question}
      </h3>

      <div className="mt-4 space-y-2">
        {options.map((option, optionIndex) => {
          const isChoice = choice === optionIndex;
          const isCorrect = checked && optionIndex === correct;
          const isWrong = checked && isChoice && optionIndex !== correct;
          return (
            <button
              key={`${option}-${optionIndex}`}
              type="button"
              onClick={() => !checked && setChoice(optionIndex)}
              disabled={checked}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] leading-relaxed transition-colors",
                isCorrect
                  ? "border-[#2E7D5B] bg-[#EAF2E7] text-[#1F4F3A]"
                  : isWrong
                    ? "border-[#C9826F] bg-[#FBEAE7] text-[#8A432D]"
                    : isChoice
                      ? "border-[#16241D] bg-[#F7F5EF] text-[#16241D]"
                      : "border-[#E7E4D9] bg-white text-[#3C4A41] hover:border-[#C9D9CC]",
              )}
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[9px] font-semibold">
                {String.fromCharCode(65 + optionIndex)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {checked && (
        <div className="mt-4 rounded-xl bg-[#FBFAF6] p-3.5">
          <p className="text-[12px] leading-relaxed text-[#3C4A41]">
            <span className="font-semibold text-[#16241D]">
              {choice === correct ? "Correct. " : "Pas tout à fait. "}
            </span>
            {question.explanation || `La bonne réponse est « ${options[correct]} ».`}
          </p>
          {question.source && (
            <p className="mt-1.5 text-[10.5px] text-[#8A968E]">Source : {question.source}</p>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        {checked ? (
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-[#16241D] px-5 py-2.5 text-[12.5px] font-semibold text-[#FBFAF6] transition-colors hover:bg-[#24382D]"
          >
            {index + 1 >= questions.length ? "Voir le score" : "Question suivante"}
          </button>
        ) : (
          <button
            type="button"
            onClick={check}
            disabled={choice === null}
            className="rounded-full bg-[#16241D] px-5 py-2.5 text-[12.5px] font-semibold text-[#FBFAF6] transition-colors hover:bg-[#24382D] disabled:cursor-not-allowed disabled:bg-[#E2DFD3] disabled:text-[#9AA096]"
          >
            Vérifier
          </button>
        )}
      </div>
    </div>
  );
}