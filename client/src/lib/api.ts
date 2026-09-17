import {
  DriveFolder,
  DriveFile,
  WikiPage,
  WikiStatus,
  Workspace,
  WorkspaceMember,
  User,
  UnifiedSearchResults,
  LekkiAISource,
  LekkiAIChatMessage,
} from "@/types/lekki";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "/api/v1";

const TOKEN_KEY = "lekki_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function extractDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      return String((detail as { message: unknown }).message);
    }
  }
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "Impossible de joindre le serveur Lekki.");
  }

  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) setToken(null);
    throw new ApiError(res.status, extractDetail(data, res.statusText));
  }
  return data as T;
}

function jsonRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

// ── Auth & Users ─────────────────────────────────────────────────────────────
export const auth = {
  async login(username: string): Promise<{ user: User; access_token: string }> {
    const data = await jsonRequest<{ user: User; access_token: string }>(
      "/auth/login",
      "POST",
      { username }
    );
    setToken(data.access_token);
    return data;
  },

  me(): Promise<User> {
    return request<User>("/auth/me");
  },

  logout(): void {
    setToken(null);
  },
};

export const usersApi = {
  list(): Promise<User[]> {
    return request<User[]>("/users");
  },
};

// ── Workspaces ───────────────────────────────────────────────────────────────
export const workspaces = {
  list(): Promise<Workspace[]> {
    return request<Workspace[]>("/workspaces");
  },

  get(id: string): Promise<Workspace> {
    return request<Workspace>(`/workspaces/${id}`);
  },

  create(data: { name: string; description?: string; icon?: string }): Promise<Workspace> {
    return jsonRequest<Workspace>("/workspaces", "POST", data);
  },

  getMembers(id: string): Promise<WorkspaceMember[]> {
    return request<WorkspaceMember[]>(`/workspaces/${id}/members`);
  },

  addMember(workspaceId: string, userId: string, role = "member"): Promise<WorkspaceMember> {
    return jsonRequest<WorkspaceMember>(`/workspaces/${workspaceId}/members`, "POST", {
      user_id: userId,
      role,
    });
  },

  removeMember(workspaceId: string, userId: string): Promise<null> {
    return request<null>(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
  },
};

// ── Drive (Dossiers & Documents) ─────────────────────────────────────────────
export const drive = {
  getFolders(params?: { scope?: string; workspace_id?: string | null; parent_id?: string | null }): Promise<DriveFolder[]> {
    const qs = new URLSearchParams();
    if (params?.scope) qs.set("scope", params.scope);
    if (params?.workspace_id) qs.set("workspace_id", params.workspace_id);
    if (params?.parent_id) qs.set("parent_id", params.parent_id);
    const qStr = qs.toString();
    return request<DriveFolder[]>(`/drive/folders${qStr ? `?${qStr}` : ""}`);
  },

  createFolder(data: { name: string; workspace_id?: string | null; parent_id?: string | null }): Promise<DriveFolder> {
    return jsonRequest<DriveFolder>("/drive/folders", "POST", data);
  },

  updateFolder(id: string, data: { name?: string; parent_id?: string | null }): Promise<DriveFolder> {
    return jsonRequest<DriveFolder>(`/drive/folders/${id}`, "PUT", data);
  },

  deleteFolder(id: string): Promise<null> {
    return request<null>(`/drive/folders/${id}`, { method: "DELETE" });
  },

  getFiles(params?: {
    scope?: "personal" | "shared_with_me" | "starred" | "trash" | "workspace" | "all";
    workspace_id?: string | null;
    folder_id?: string | null;
    search?: string;
  }): Promise<DriveFile[]> {
    const qs = new URLSearchParams();
    if (params?.scope) qs.set("scope", params.scope);
    if (params?.workspace_id) qs.set("workspace_id", params.workspace_id);
    if (params?.folder_id !== undefined) qs.set("folder_id", params.folder_id || "");
    if (params?.search) qs.set("search", params.search);
    const qStr = qs.toString();
    return request<DriveFile[]>(`/drive/files${qStr ? `?${qStr}` : ""}`);
  },

  getFile(id: string): Promise<DriveFile> {
    return request<DriveFile>(`/drive/files/${id}`);
  },

  getFileIndex(id: string): Promise<DocumentIndexInfo> {
    return request<DocumentIndexInfo>(`/drive/files/${id}/index`);
  },

  createFile(data: {
    file: File;
    workspace_id?: string | null;
    folder_id?: string | null;
    tags?: string[];
  }): Promise<DriveFile> {
    const formData = new FormData();
    formData.append("file", data.file);
    if (data.workspace_id) formData.append("workspace_id", data.workspace_id);
    if (data.folder_id) formData.append("folder_id", data.folder_id);
    if (data.tags) formData.append("tags", JSON.stringify(data.tags));
    return request<DriveFile>("/drive/files", {
      method: "POST",
      body: formData,
    });
  },

  updateFile(id: string, data: Partial<DriveFile>): Promise<DriveFile> {
    return jsonRequest<DriveFile>(`/drive/files/${id}`, "PUT", data);
  },

  shareFile(id: string, user_ids: string[]): Promise<DriveFile> {
    return jsonRequest<DriveFile>(`/drive/files/${id}/share`, "POST", { user_ids });
  },

  deleteFile(id: string, permanent = false): Promise<null> {
    return request<null>(`/drive/files/${id}${permanent ? "?permanent=true" : ""}`, {
      method: "DELETE",
    });
  },
};

// ── Wiki Collaboratif ────────────────────────────────────────────────────────
export const wiki = {
  getPages(params?: {
    workspace_id?: string;
    category?: string;
    topic?: string;
    section?: string;
    status?: string;
  }): Promise<WikiPage[]> {
    const qs = new URLSearchParams();
    if (params?.workspace_id) qs.set("workspace_id", params.workspace_id);
    if (params?.category) qs.set("category", params.category);
    if (params?.topic) qs.set("topic", params.topic);
    if (params?.section) qs.set("section", params.section);
    if (params?.status) qs.set("status", params.status);
    const qStr = qs.toString();
    return request<WikiPage[]>(`/wiki/pages${qStr ? `?${qStr}` : ""}`);
  },

  getPage(id: string): Promise<WikiPage> {
    return request<WikiPage>(`/wiki/pages/${id}`);
  },

  createPage(data: {
    title: string;
    content?: string;
    category?: "cours" | "methodes" | "syntheses" | "faq" | "guides";
    topic?: string;
    section?: string;
    parent_page_id?: string | null;
    workspace_id?: string;
    related_document_ids?: string[];
    related_wiki_ids?: string[];
  }): Promise<WikiPage> {
    return jsonRequest<WikiPage>("/wiki/pages", "POST", data);
  },

  updatePage(
    id: string,
    data: {
      title?: string;
      content?: string;
      category?: string;
      topic?: string;
      section?: string;
      parent_page_id?: string | null;
      related_document_ids?: string[];
      related_wiki_ids?: string[];
      comment?: string;
    }
  ): Promise<WikiPage> {
    return jsonRequest<WikiPage>(`/wiki/pages/${id}`, "PUT", data);
  },

  updateStatus(id: string, status: WikiStatus): Promise<WikiPage> {
    return jsonRequest<WikiPage>(`/wiki/pages/${id}/status`, "POST", { status });
  },

  restoreVersion(id: string, version: number): Promise<WikiPage> {
    return jsonRequest<WikiPage>(`/wiki/pages/${id}/restore/${version}`, "POST", {});
  },

  deletePage(id: string): Promise<null> {
    return request<null>(`/wiki/pages/${id}`, { method: "DELETE" });
  },
};

// ── Unified Search ───────────────────────────────────────────────────────────
export const searchApi = {
  unified(q: string, workspace_id?: string): Promise<UnifiedSearchResults> {
    const qs = new URLSearchParams();
    qs.set("q", q);
    if (workspace_id) qs.set("workspace_id", workspace_id);
    return request<UnifiedSearchResults>(`/search?${qs.toString()}`);
  },
};

// ── Lekki AI ─────────────────────────────────────────────────────────────────
export interface AskResponse {
  message_id?: string;
  answer: string;
  sources: LekkiAISource[];
  contradiction?: string | null;
  confidence: number;
  provider?: string;
}

export const aiApi = {
  ask(question: string, workspace_id?: string): Promise<AskResponse> {
    return jsonRequest<AskResponse>("/ask", "POST", { question, workspace_id });
  },

  history(): Promise<LekkiAIChatMessage[]> {
    return request<LekkiAIChatMessage[]>("/chats/history");
  },

  clearHistory(): Promise<null> {
    return request<null>("/chats/history", { method: "DELETE" });
  },
};

// Legacy compatibility for older components if any
export const pages = {
  list(params?: { category?: string; workspaceId?: string }) {
    return wiki.getPages({
      workspace_id: params?.workspaceId,
      category: params?.category,
    });
  },
  get(id: string) {
    return wiki.getPage(id);
  },
};
