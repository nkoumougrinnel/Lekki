export type FileExtension = "pdf" | "docx" | "pptx" | "txt" | "md" | "xlsx";

export interface DriveFolder {
  id: string;
  name: string;
  parent_id?: string | null;
  owner_id: string;
  workspace_id?: string | null;
  created_at: string;
}

export interface ChapterInfo {
  number: string;
  title: string;
  page: number;
  subtopics?: string[];
}

export interface KeyPassage {
  label: string;
  location: string;
  excerpt: string;
}

export interface DriveFile {
  id: string;
  name: string;
  extension: FileExtension;
  size_bytes: number;
  mime_type: string;
  content: string;
  summary?: string;
  owner_id: string;
  owner_name?: string;
  workspace_id?: string | null;
  folder_id?: string | null;
  is_starred: boolean;
  is_deleted: boolean;
  shared_with: string[];
  created_at: string;
  updated_at: string;
  page_count?: number;
  indexed_chunks_count?: number;
  detected_chapters?: ChapterInfo[];
  key_passages?: KeyPassage[];
  linked_wiki_ids?: string[];
  is_owner?: boolean;
  index_meta?: DocumentIndexInfo;
}

export interface DocumentIndexInfo {
  total_pages_analyzed: number;
  total_chunks: number;
  chapters_detected: string[];
}

export type WikiStatus = "draft" | "community" | "verified";
export type WikiCategory = "cours" | "methodes" | "syntheses" | "faq" | "guides";

export interface WikiHistoryEntry {
  version: number;
  author_id: string;
  author_name: string;
  updated_at: string;
  comment?: string;
  content: string;
  created_at?: string;
}

export type WikiVersion = WikiHistoryEntry;

export interface WikiPage {
  id: string;
  title: string;
  content: string;
  category?: WikiCategory | string;
  topic?: string;
  section?: string;
  parent_page_id?: string | null;
  workspace_id: string;
  status: WikiStatus;
  status_verified_by?: string | null;
  status_verified_at?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  creator_id: string;
  creator_name?: string;
  author_name?: string;
  last_editor_id: string;
  last_editor_name?: string;
  view_count: number;
  current_version?: number;
  related_document_ids: string[];
  related_wiki_ids?: string[];
  related_wiki_pages?: Array<{
    id: string;
    title: string;
    topic?: string;
    section?: string;
  }>;
  linked_documents?: Array<{
    id: string;
    name: string;
    extension: FileExtension;
    size_bytes?: number;
    summary?: string;
  }>;
  history: WikiHistoryEntry[];
  versions?: WikiHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  icon?: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "verifier" | string;
  joined_at: string;
  user_name?: string;
  user_email?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "reader" | string;
  avatar?: string;
}

export interface DocumentProvenance {
  document_id: string;
  document_name: string;
  document_type: FileExtension;
  chapter?: string;
  section?: string;
  locator?: string;
}

export interface WikiProvenance {
  wiki_id: string;
  wiki_title: string;
  topic?: string;
  section?: string;
  heading?: string;
  status: WikiStatus;
}

export type SourceProvenance =
  | ({ type: "document" } & DocumentProvenance)
  | ({ type: "wiki" } & WikiProvenance);

export interface IndexedChunk {
  id: string;
  source_id: string;
  source_type: "document" | "wiki";
  content: string;
  provenance: SourceProvenance;
  score?: number;
}

export interface LekkiAISource {
  id: string;
  type: "document" | "wiki";
  title: string;
  detail?: string;
  location?: string; // e.g. "Chapitre 4 — Routage dynamique · p. 42–48" or "p. 12 · Exercice 3" or "Wiki / Réseaux / Routage"
  page?: number | string;
  page_range?: string;
  chapter?: string;
  section?: string;
  slide?: number;
  file_extension?: FileExtension;
  size_bytes?: number;
  page_anchor?: string;
  excerpt: string;
  score: number;
  workspace_id?: string | null;
  provenance?: SourceProvenance;
}

export interface LekkiAIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  created_at?: string;
  sources?: LekkiAISource[];
  contradiction?: string | null;
}

export interface SearchItemDocument {
  id: string;
  title: string;
  extension: FileExtension;
  type: "document";
  category: string;
  excerpt: string;
  workspace_id?: string | null;
}

export interface SearchItemWiki {
  id: string;
  title: string;
  type: "wiki";
  status: WikiStatus;
  category: string;
  excerpt: string;
}

export interface SearchItemShared {
  id: string;
  title: string;
  extension: FileExtension;
  type: "shared";
  shared_by: string;
  excerpt: string;
}

export interface UnifiedSearchResults {
  documents: SearchItemDocument[];
  wiki: SearchItemWiki[];
  shared: SearchItemShared[];
}

export type NavView =
  | "home"
  | "my_docs"
  | "starred"
  | "shared_with_me"
  | "trash"
  | "workspace_files"
  | "workspace_wiki";
