/**
 * Reconnaissance automatique des documents étudiants à partir de leur nom,
 * sur le modèle de SUP'DOCS : « TS_Examen_ALT_2024.pdf », « TS_RAT_CL_2022.pdf »,
 * dossiers COURS / TD / CC / SUJETS…
 * Aucune donnée n'est stockée : tout est déduit à l'affichage.
 */
import type { DriveFile } from "@/types/lekki";

export type StudentDocKind = "examen" | "rattrapage" | "cc" | "td" | "tp" | "cours" | "fiche" | "autre";

export interface StudentDocInfo {
  kind: StudentDocKind;
  label: string;
  isExam: boolean;
  year?: string;
  track?: "ALT" | "CL";
  subject?: string;
}

const KIND_LABELS: Record<StudentDocKind, string> = {
  examen: "Examen",
  rattrapage: "Rattrapage",
  cc: "Contrôle continu",
  td: "TD",
  tp: "TP",
  cours: "Cours",
  fiche: "Fiche",
  autre: "Document",
};

export const KIND_STYLES: Record<StudentDocKind, string> = {
  examen: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
  rattrapage: "bg-orange-500/10 text-orange-300 ring-orange-400/20",
  cc: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
  td: "bg-sky-500/10 text-sky-300 ring-sky-400/20",
  tp: "bg-violet-500/10 text-violet-300 ring-violet-400/20",
  cours: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
  fiche: "bg-teal-500/10 text-teal-300 ring-teal-400/20",
  autre: "bg-zinc-500/10 text-zinc-300 ring-zinc-400/20",
};

function tokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .split(/[\s_\-.()[\]]+/)
    .filter(Boolean);
}

/** `folderName` : nom du dossier parent, si connu (COURS, TD, SUJETS, CC…). */
export function classifyDocument(name: string, folderName?: string | null): StudentDocInfo {
  const parts = tokens(name);
  const folder = tokens(folderName || "");
  const has = (...words: string[]) => parts.some((part) => words.includes(part));
  const inFolder = (...words: string[]) => folder.some((part) => words.includes(part));

  let kind: StudentDocKind = "autre";
  if (has("rat", "rattrapage")) kind = "rattrapage";
  else if (has("examen", "exam", "partiel")) kind = "examen";
  else if (has("cc", "controle", "ds", "devoir", "interro")) kind = "cc";
  else if (has("td")) kind = "td";
  else if (has("tp")) kind = "tp";
  else if (has("cours", "chapitre", "chap", "lecon", "poly", "polycopie")) kind = "cours";
  else if (has("fiche", "resume", "synthese", "revision")) kind = "fiche";
  else if (has("sujet", "sujets") || inFolder("sujets", "sujet")) kind = "examen";
  else if (inFolder("cc")) kind = "cc";
  else if (inFolder("td")) kind = "td";
  else if (inFolder("tp")) kind = "tp";
  else if (inFolder("cours")) kind = "cours";

  const yearMatch = name.match(/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/);
  const track = has("alt") ? "ALT" : has("cl") ? "CL" : undefined;

  // Le préfixe avant le premier mot-clé sert de matière (« TS_Examen… » → « TS »).
  const keywordIndex = parts.findIndex((part) =>
    ["rat", "rattrapage", "examen", "exam", "cc", "td", "tp", "cours", "sujet", "chap", "chapitre"].includes(part)
  );
  const rawSubject = keywordIndex > 0 ? name.replace(/\.[a-z0-9]+$/i, "").split(/[_\-\s]+/).slice(0, keywordIndex).join(" ") : undefined;

  return {
    kind,
    label: KIND_LABELS[kind],
    isExam: kind === "examen" || kind === "rattrapage" || kind === "cc",
    year: yearMatch?.[1],
    track,
    subject: rawSubject && rawSubject.length <= 40 ? rawSubject : undefined,
  };
}

export function classifyFile(file: Pick<DriveFile, "name">, folderName?: string | null): StudentDocInfo {
  return classifyDocument(file.name, folderName);
}

/** Nom lisible : « TS_Examen_ALT_2024.pdf » → « TS Examen ALT 2024 ». */
export function prettyName(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}
