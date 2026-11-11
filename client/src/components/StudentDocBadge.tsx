import React from "react";
import { KIND_STYLES, StudentDocInfo, StudentDocKind } from "@/lib/studentDocs";

/** Dans les listes serrées (cartes, téléphone), les libellés longs sont abrégés. */
const SHORT_LABELS: Partial<Record<StudentDocKind, string>> = { cc: "CC", rattrapage: "RAT" };

export function StudentDocBadge({ info, compact = false }: { info: StudentDocInfo; compact?: boolean }) {
  if (info.kind === "autre" && !info.year) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {info.kind !== "autre" && (
        <span
          title={info.label}
          className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] sm:text-[10px] font-semibold ring-1 ring-inset ${KIND_STYLES[info.kind]}`}
        >
          {compact ? SHORT_LABELS[info.kind] ?? info.label : info.label}
        </span>
      )}
      {!compact && info.year && (
        <span className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[11px] sm:text-[10px] font-medium text-zinc-300 ring-1 ring-inset ring-white/5">
          {info.year}
        </span>
      )}
      {!compact && info.track && (
        <span
          title={info.track === "ALT" ? "Filière alternance" : "Filière classique"}
          className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[11px] sm:text-[10px] font-medium text-zinc-400 ring-1 ring-inset ring-white/5"
        >
          {info.track}
        </span>
      )}
    </span>
  );
}
