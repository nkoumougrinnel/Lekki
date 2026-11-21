import React from "react";
import { AcademicInfo, PROGRAMS, SPECIALTIES, Specialty, needsSpecialty } from "@/lib/curriculum";

interface AcademicFieldsProps {
  value: AcademicInfo | null;
  onChange: (value: AcademicInfo | null) => void;
  /** Propose « Pas de programme » (club, groupe…). */
  allowNone?: boolean;
}

/** Choix du programme d'une promo : cycle, niveau et spécialité. */
export function AcademicFields({ value, onChange, allowNone = true }: AcademicFieldsProps) {
  const program = PROGRAMS[0];
  const enabled = Boolean(value);
  const level = value?.level ?? 2;

  const setLevel = (next: 1 | 2 | 3) =>
    onChange({ program: "supptic-itt", level: next, specialty: needsSpecialty(next) ? value?.specialty ?? null : null });
  const setSpecialty = (next: Specialty | null) => onChange({ program: "supptic-itt", level, specialty: next });

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <OptionButton
          selected={enabled}
          onClick={() => onChange({ program: "supptic-itt", level, specialty: value?.specialty ?? null })}
          title={`${program.school} · ${program.short}`}
          hint={program.name}
        />
        {allowNone && (
          <OptionButton
            selected={!enabled}
            onClick={() => onChange(null)}
            title="Pas de programme"
            hint="Club, groupe de projet, autre école"
          />
        )}
      </div>

      {enabled && (
        <div className="space-y-3 rounded-xl bg-[#F1F0E9] p-3 ring-1 ring-inset ring-black/[0.05]">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-body">Niveau</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 3] as const).map((option) => (
                <Segment key={option} selected={level === option} onClick={() => setLevel(option)}>
                  ITT{option}
                  <span className="ml-1 text-[10px] font-normal text-subtle">S{option * 2 - 1}–S{option * 2}</span>
                </Segment>
              ))}
            </div>
          </div>

          {needsSpecialty(level) && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-body">
                Spécialité <span className="font-normal text-subtle">(à partir du S4)</span>
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <Segment selected={!value?.specialty} onClick={() => setSpecialty(null)}>
                  Pas encore
                </Segment>
                {SPECIALTIES.map((specialty) => (
                  <Segment
                    key={specialty.value}
                    selected={value?.specialty === specialty.value}
                    onClick={() => setSpecialty(specialty.value)}
                    title={specialty.label}
                  >
                    {specialty.short}
                  </Segment>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] leading-relaxed text-subtle">
            Lekki range les cours et les sujets par matière, d’après le {program.source.toLowerCase()}.
          </p>
        </div>
      )}
    </div>
  );
}

function OptionButton({ selected, onClick, title, hint }: { selected: boolean; onClick: () => void; title: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border p-3 text-left transition ${
        selected
          ? "border-emerald-400/40 bg-emerald-400/[0.07] ring-1 ring-inset ring-emerald-400/10"
          : "border-[#E7E4D9] bg-[#F8F7F2] hover:border-[#E7E4D9]"
      }`}
    >
      <span className={`block text-xs font-medium ${selected ? "text-heading" : "text-body"}`}>{title}</span>
      <span className="mt-0.5 block text-[10px] leading-relaxed text-subtle">{hint}</span>
    </button>
  );
}

function Segment({
  selected, onClick, children, title,
}: { selected: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={selected}
      className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
        selected ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-[#E7E4D9] text-muted hover:text-strong"
      }`}
    >
      {children}
    </button>
  );
}
