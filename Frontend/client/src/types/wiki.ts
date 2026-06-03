export type PageCategory = 'rh' | 'technique' | 'commercial' | 'guides';

export interface DocumentAccessUser {
  userId: string;
  role: string;
}

export interface DocumentAccess {
  public: boolean;
  users: DocumentAccessUser[];
  groups: string[];
}

export interface WikiDocument {
  id: string;
  title: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: string;
  tags: string[];
  access: DocumentAccess;
  isFolder: boolean;
  children?: WikiDocument[];
  category?: PageCategory;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'reader' | string;
  avatar?: string;
}

export interface RAGSource {
  documentId: string;
  title: string;
  excerpt: string;
  relevance: number;
}

export interface RAGResponse {
  query: string;
  answer: string;
  confidence: number;
  sources: RAGSource[];
  generatedAt: Date;
}

export interface WikiStats {
  totalDocuments: number;
  totalFolders: number;
  recentlyUpdated: WikiDocument[];
  favorites: WikiDocument[];
  contributorsCount: number;
}
