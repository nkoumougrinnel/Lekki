/**
 * Programme d'études d'un espace et rapprochement « fichier → matière ».
 *
 * Un espace de promo porte un programme (ex. SUP'PTIC · ITT, niveau 2, spécialité IR).
 * Lekki en déduit les matières du semestre, et reconnaît à quelle matière appartient chaque
 * fichier à partir de son nom (« TS_Examen_CL_2024 ») et des dossiers qui le contiennent
 * (« TRAITEMENT DU SIGNAL / SUJETS »). Rien n'est stocké : tout est recalculé à l'affichage.
 */
import {
  CurriculumEC,
  CurriculumUE,
  SEMESTERS_COMMON,
  SEMESTER_4,
  SEMESTER_5,
  SEMESTER_6,
  Specialty,
} from "@/data/supptic-itt";

export type { Specialty } from "@/data/supptic-itt";

export interface AcademicInfo {
  program: "supptic-itt";
  level: 1 | 2 | 3;
  specialty?: Specialty | null;
}

export interface Subject {
  /** Identifiant stable dans l'espace : « S3:IT311 ». */
  id: string;
  semester: number;
  code: string | null;
  title: string;
  ue: CurriculumUE;
  ec: CurriculumEC;
}

export const PROGRAMS = [
  {
    id: "supptic-itt" as const,
    school: "SUP’PTIC",
    name: "Ingénieur des Travaux des Télécommunications",
    short: "ITT",
    source: "Programme officiel 2018-2019",
  },
];

export const SPECIALTIES: { value: Specialty; label: string; short: string }[] = [
  { value: "IR", label: "Informatique et Réseaux", short: "IR" },
  { value: "RC", label: "Radiocommunications", short: "RC" },
  { value: "RT", label: "Réseaux et Télécoms", short: "RT" },
];

export function parseAcademic(value: unknown): AcademicInfo | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<AcademicInfo>;
  if (raw.program !== "supptic-itt") return null;
  if (raw.level !== 1 && raw.level !== 2 && raw.level !== 3) return null;
  const specialty = raw.specialty && ["IR", "RC", "RT"].includes(raw.specialty) ? raw.specialty : null;
  return { program: "supptic-itt", level: raw.level, specialty };
}

export function academicLabel(info: AcademicInfo): string {
  const specialty = info.specialty ? ` · ${info.specialty}` : "";
  return `ITT${info.level}${specialty}`;
}

/** ITT1 → S1/S2, ITT2 → S3/S4, ITT3 → S5/S6. */
export function semestersOf(info: AcademicInfo): [number, number] {
  return [info.level * 2 - 1, info.level * 2];
}

/** De septembre à février : premier semestre de l'année ; ensuite, le second. */
export function currentSemester(info: AcademicInfo, now: Date = new Date()): number {
  const [first, second] = semestersOf(info);
  const month = now.getMonth() + 1;
  return month >= 9 || month <= 2 ? first : second;
}

/** La spécialité n'existe qu'à partir du S4 : en ITT1, inutile de la demander. */
export function needsSpecialty(level: number): boolean {
  return level >= 2;
}

export function semesterPlan(semester: number, specialty?: Specialty | null): CurriculumUE[] {
  if (semester >= 1 && semester <= 3) return SEMESTERS_COMMON[semester as 1 | 2 | 3];
  const spec: Specialty = specialty || "IR";
  if (semester === 4) return spec === "IR" ? SEMESTER_4.IR : SEMESTER_4.RCRT;
  if (semester === 5) return SEMESTER_5[spec];
  if (semester === 6) return SEMESTER_6[spec];
  return [];
}

export function subjectsOf(semester: number, specialty?: Specialty | null, includeActivities = false): Subject[] {
  return semesterPlan(semester, specialty).flatMap((ue) =>
    ue.ecs
      .filter((ec) => includeActivities || !ec.activity)
      .map((ec) => ({
        id: `S${semester}:${ec.code || slug(ec.title)}`,
        semester,
        code: ec.code,
        title: ec.title,
        ue,
        ec,
      }))
  );
}

/** Toutes les matières que l'espace peut rencontrer (les 6 semestres de sa spécialité). */
export function allSubjects(info: AcademicInfo): Subject[] {
  return [1, 2, 3, 4, 5, 6].flatMap((semester) => subjectsOf(semester, info.specialty));
}

// ── Rapprochement ────────────────────────────────────────────────────────────

const SEPARATOR_TOKENS = new Set([
  "cours", "cour", "td", "tds", "tp", "tps", "cc", "examen", "exam", "examens", "rat", "rattrapage", "sujet", "sujets",
  "correction", "corrige", "corriges", "solution", "solutions", "chap", "chapitre", "serie", "devoir", "ds", "partiel",
  "alt", "cl", "session", "normale", "fiche", "resume", "polycopie", "poly", "et", "de", "du", "des", "la", "le", "les",
]);

export function normalize(value: string): string {
  return value
    .replace(/([a-zà-ÿ])([A-Z])/g, "$1 $2") // camelCase : « CorrectionCcGenieCivil »
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/, "")
    .replace(/[’'`_\-.,+()/&:;[\]]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token === "ii" ? "2" : token === "iii" ? "3" : token === "iv" ? "4" : token === "i" ? "1" : token))
    .join(" ");
}

function isSeparator(token: string): boolean {
  if (SEPARATOR_TOKENS.has(token)) return true;
  if (/^(19|20)\d{2}$/.test(token)) return true; // année
  if (/^\d+$/.test(token) && token.length > 1) return true; // « 02 »
  return /^(chap|chapitre|td|tp|cc|serie|seance|partie)\d+$/.test(token); // « chap3 », « serie3 »
}

/** « TS_Examen_CL_2024 » → ["ts"] ; « Cours_Antennes_Chap2_Propagation » → ["antennes", "propagation"]. */
export function nameSegments(fileName: string): string[] {
  const segments: string[] = [];
  let current: string[] = [];
  for (const token of normalize(fileName).split(" ")) {
    if (isSeparator(token)) {
      if (current.length) segments.push(current.join(" "));
      current = [];
    } else {
      current.push(token);
    }
  }
  if (current.length) segments.push(current.join(" "));
  return segments;
}

function aliasesOf(subject: Subject): string[] {
  return [normalize(subject.title), ...(subject.ec.aliases || []).map(normalize)];
}

export function scoreSubject(subject: Subject, segments: string[], folderNames: string[]): number {
  let best = 0;
  const title = normalize(subject.title);
  for (const alias of aliasesOf(subject)) {
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      const order = index === 0 ? 0.5 : 0; // le premier segment est souvent la matière
      if (segment === alias) best = Math.max(best, 10 + order + alias.length / 100);
      else if (alias.length >= 4 && segment.startsWith(`${alias} `)) best = Math.max(best, 6 + order);
      else if (alias.length >= 5 && ` ${segment} `.includes(` ${alias} `)) best = Math.max(best, 4 + order);
    }
  }
  for (const folder of folderNames.map(normalize)) {
    if (folder === title || (subject.code && folder.split(" ").includes(normalize(subject.code)))) best = Math.max(best, 9);
    else if (title.length >= 6 && ` ${folder} `.includes(` ${title} `)) best = Math.max(best, 3);
  }
  return best;
}

/**
 * La matière la plus probable, ou null.
 * `preferredSemesters` : les semestres de la promo départagent les homonymes (« Anglais », « Algèbre »).
 */
export function matchSubject(
  fileName: string,
  folderNames: string[],
  subjects: Subject[],
  preferredSemesters: number[] = []
): Subject | null {
  const segments = nameSegments(fileName);
  let winner: Subject | null = null;
  let winnerScore = 0;
  for (const subject of subjects) {
    const score = scoreSubject(subject, segments, folderNames) + (preferredSemesters.includes(subject.semester) ? 0.25 : 0);
    if (score > winnerScore) {
      winner = subject;
      winnerScore = score;
    }
  }
  return winnerScore >= 4 ? winner : null;
}

/** Noms des dossiers parents d'un fichier, du plus proche au plus lointain. */
export function folderChain(
  folderId: string | null | undefined,
  folders: { id: string; name: string; parent_id?: string | null }[]
): string[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const names: string[] = [];
  let cursor = folderId ? byId.get(folderId) : undefined;
  let guard = 0;
  while (cursor && guard++ < 20) {
    names.push(cursor.name);
    cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
  }
  return names;
}

function slug(value: string): string {
  return normalize(value).replace(/\s+/g, "-");
}
