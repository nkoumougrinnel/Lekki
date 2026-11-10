/**
 * La « bibliothèque » d'un espace : chaque document rangé sous sa matière.
 * Calcul pur, à mémoriser côté composant (useMemo).
 */
import type { DriveFile, DriveFolder, WikiPage, Workspace } from "@/types/lekki";
import {
  AcademicInfo,
  Subject,
  allSubjects,
  currentSemester,
  folderChain,
  matchSubject,
  normalize,
  parseAcademic,
  semestersOf,
  subjectsOf,
} from "@/lib/curriculum";
import { StudentDocInfo, classifyDocument } from "@/lib/studentDocs";

export interface LibraryEntry {
  file: DriveFile;
  info: StudentDocInfo;
  subject: Subject | null;
}

export interface SubjectShelf {
  subject: Subject;
  courses: LibraryEntry[];
  exams: LibraryEntry[];
  corriges: LibraryEntry[];
  wiki: WikiPage[];
}

export interface Library {
  academic: AcademicInfo | null;
  /** Semestres de la promo (ex. [3, 4] en ITT2). */
  semesters: number[];
  current: number | null;
  entries: LibraryEntry[];
  shelves: Map<string, SubjectShelf>;
  unmatched: LibraryEntry[];
  subjectsOfSemester: (semester: number) => Subject[];
}

const byNewest = (a: LibraryEntry, b: LibraryEntry) =>
  (b.info.year || "").localeCompare(a.info.year || "") || b.file.updated_at.localeCompare(a.file.updated_at);

export function buildLibrary(
  files: DriveFile[],
  folders: DriveFolder[],
  wikiPages: WikiPage[],
  workspace: Workspace | null
): Library {
  const academic = parseAcademic(workspace?.academic);
  const semesters = academic ? [...semestersOf(academic)] : [];
  const candidates = academic ? allSubjects(academic) : [];
  const shelves = new Map<string, SubjectShelf>();
  const shelfOf = (subject: Subject) => {
    let shelf = shelves.get(subject.id);
    if (!shelf) {
      shelf = { subject, courses: [], exams: [], corriges: [], wiki: [] };
      shelves.set(subject.id, shelf);
    }
    return shelf;
  };
  // Les matières de la promo existent même vides : c'est le squelette de l'espace.
  if (academic) semesters.forEach((semester) => subjectsOf(semester, academic.specialty).forEach(shelfOf));

  const folderNames = new Map<string, string>(folders.map((folder) => [folder.id, folder.name]));
  const entries: LibraryEntry[] = files
    .filter((file) => !file.is_deleted)
    .map((file) => {
      const chain = folderChain(file.folder_id, folders);
      const info = classifyDocument(file.name, file.folder_id ? folderNames.get(file.folder_id) : null);
      const subject = academic ? matchSubject(file.name, chain, candidates, semesters) : null;
      return { file, info, subject };
    });

  const unmatched: LibraryEntry[] = [];
  for (const entry of entries) {
    if (!entry.subject) {
      unmatched.push(entry);
      continue;
    }
    const shelf = shelfOf(entry.subject);
    if (entry.info.isExam) shelf.exams.push(entry);
    else if (entry.info.kind === "corrige") shelf.corriges.push(entry);
    else shelf.courses.push(entry);
  }
  shelves.forEach((shelf) => {
    shelf.exams.sort(byNewest);
    shelf.corriges.sort(byNewest);
    shelf.courses.sort((a, b) => a.file.name.localeCompare(b.file.name, "fr", { numeric: true }));
  });

  if (academic) {
    for (const page of wikiPages) {
      const subject = matchWikiPage(page, candidates, semesters);
      if (subject) shelfOf(subject).wiki.push(page);
    }
  }

  return {
    academic,
    semesters,
    current: academic ? currentSemester(academic) : null,
    entries,
    shelves,
    unmatched,
    subjectsOfSemester: (semester) => (academic ? subjectsOf(semester, academic.specialty) : []),
  };
}

/** Une fiche wiki appartient à une matière par son pôle/section (« IT311 · Traitement du signal ») ou son titre. */
function matchWikiPage(page: WikiPage, subjects: Subject[], preferred: number[]): Subject | null {
  const labels = [page.topic, page.section].filter(Boolean).map((value) => normalize(String(value)));
  for (const subject of subjects) {
    const title = normalize(subject.title);
    const code = subject.code ? normalize(subject.code) : null;
    if (labels.some((label) => label.includes(title) || (code && label.split(" ").includes(code)))) return subject;
  }
  return matchSubject(page.title, [page.section || "", page.topic || ""], subjects, preferred);
}

/** Libellé de pôle wiki pour une matière : « IT311 · Traitement du signal ». */
export function wikiTopicFor(subject: Subject): string {
  return subject.code ? `${subject.code} · ${subject.title}` : subject.title;
}
