// Client API pour le backend Lekki Wiki (FastAPI).
// Base URL configurable via VITE_API_URL (voir Frontend/.env).

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ??
  'http://localhost:8000/api/v1';

const TOKEN_KEY = 'lekki_token';

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
    this.name = 'ApiError';
    this.status = status;
  }
}

function extractDetail(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && 'message' in detail) {
      return String((detail as { message: unknown }).message);
    }
  }
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Impossible de joindre le serveur. Le backend est-il démarré ?');
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
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'reader' | string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export type PageCategory = 'rh' | 'technique' | 'commercial' | 'guides';

export interface Page {
  id: string;
  title: string;
  content: string;
  category: PageCategory;
  status: string;
  is_embedded: boolean;
  view_count: number;
  creator_id: string;
  workspace_id?: string | null;
  summary?: string | null;
  summary_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PageSummary {
  page_id: string;
  summary?: string | null;
  summary_at?: string | null;
  cached: boolean;
  provider?: string | null;
}

export interface RelatedPage {
  page_id: string;
  title: string;
  category: PageCategory;
  score: number;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  created_at: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'partial' | 'failed';

export interface ImportJob {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  source_type: string;
  source_name: string;
  status: ImportStatus;
  total_files: number;
  processed_files: number;
  error_log?: string | null;
  progress: number;
  created_at: string;
}

export interface AskSource {
  page_id: string;
  title?: string;
  excerpt: string;
  score: number;
}

export interface AskResponse {
  message_id?: string | null;
  user_message_id?: string | null;
  answer: string;
  sources: AskSource[];
  confidence: number;
  provider?: string | null;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch {
      throw new ApiError(0, 'Impossible de joindre le serveur. Le backend est-il démarré ?');
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, extractDetail(data, 'Échec de la connexion'));

    setToken((data as AuthResponse).access_token);
    return data as AuthResponse;
  },

  register(username: string, email: string, password: string): Promise<AuthResponse> {
    return jsonRequest<AuthResponse>('/auth/register', 'POST', { username, email, password }).then(
      (data) => {
        setToken(data.access_token);
        return data;
      },
    );
  },

  me(): Promise<ApiUser> {
    return request<ApiUser>('/auth/me');
  },

  logout(): void {
    setToken(null);
  },
};

// ── Pages ───────────────────────────────────────────────────────────────────

export const pages = {
  list(
    params: { category?: PageCategory; workspaceId?: string; skip?: number; limit?: number } = {},
  ): Promise<Page[]> {
    const search = new URLSearchParams();
    if (params.category) search.set('category', params.category);
    if (params.workspaceId) search.set('workspace_id', params.workspaceId);
    if (params.skip != null) search.set('skip', String(params.skip));
    if (params.limit != null) search.set('limit', String(params.limit));
    const qs = search.toString();
    return request<Page[]>(`/pages${qs ? `?${qs}` : ''}`);
  },

  search(q: string): Promise<Page[]> {
    return request<Page[]>(`/pages/search?q=${encodeURIComponent(q)}`);
  },

  get(id: string): Promise<Page> {
    return request<Page>(`/pages/${id}`);
  },

  create(input: {
    title: string;
    content: string;
    category: PageCategory;
    workspace_id: string;
  }): Promise<Page> {
    return jsonRequest<Page>('/pages', 'POST', input);
  },

  update(
    id: string,
    input: Partial<{ title: string; content: string; category: PageCategory; status: string }>,
  ): Promise<Page> {
    return jsonRequest<Page>(`/pages/${id}`, 'PUT', input);
  },

  remove(id: string): Promise<null> {
    return request<null>(`/pages/${id}`, { method: 'DELETE' });
  },

  summarize(id: string, force = false): Promise<PageSummary> {
    return jsonRequest<PageSummary>(
      `/pages/${id}/summarize${force ? '?force=true' : ''}`,
      'POST',
    );
  },

  summary(id: string): Promise<PageSummary> {
    return request<PageSummary>(`/pages/${id}/summary`);
  },

  related(id: string, limit = 5): Promise<RelatedPage[]> {
    return request<RelatedPage[]>(`/pages/${id}/related?limit=${limit}`);
  },
};

// ── Workspaces ─────────────────────────────────────────────────────────────────

export const workspaces = {
  list(): Promise<Workspace[]> {
    return request<Workspace[]>('/workspaces');
  },

  get(id: string): Promise<Workspace> {
    return request<Workspace>(`/workspaces/${id}`);
  },

  create(input: { name: string; description?: string }): Promise<Workspace> {
    return jsonRequest<Workspace>('/workspaces', 'POST', input);
  },

  members(id: string): Promise<WorkspaceMember[]> {
    return request<WorkspaceMember[]>(`/workspaces/${id}/members`);
  },

  addMember(id: string, input: { user_id: string; role?: WorkspaceRole }): Promise<WorkspaceMember> {
    return jsonRequest<WorkspaceMember>(`/workspaces/${id}/members`, 'POST', input);
  },

  removeMember(id: string, userId: string): Promise<null> {
    return request<null>(`/workspaces/${id}/members/${userId}`, { method: 'DELETE' });
  },
};

// ── Users (admin) ───────────────────────────────────────────────────────────────

export const users = {
  list(): Promise<ApiUser[]> {
    return request<ApiUser[]>('/users/');
  },
};

// ── Imports (import documentaire) ────────────────────────────────────────────────

export const imports = {
  create(files: File[], workspaceId: string, category?: PageCategory): Promise<ImportJob> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    form.append('workspace_id', workspaceId);
    if (category) form.append('category', category);
    // Pas de Content-Type manuel : le navigateur gère le boundary multipart.
    return request<ImportJob>('/imports', { method: 'POST', body: form });
  },

  get(id: string): Promise<ImportJob> {
    return request<ImportJob>(`/imports/${id}`);
  },

  list(): Promise<ImportJob[]> {
    return request<ImportJob[]>('/imports');
  },
};

// ── Chats (conversations) ────────────────────────────────────────────────────

export interface Chat {
  id: string;
  title: string;
  user_id: string;
  workspace_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ChatContext {
  chat_id: string;
  exchanges: { role: string; content: string }[];
  count: number;
  max_exchanges: number;
}

export const chats = {
  create(title: string, workspaceId?: string): Promise<Chat> {
    return jsonRequest<Chat>('/chats', 'POST', {
      title,
      workspace_id: workspaceId ?? null,
    });
  },

  context(id: string): Promise<ChatContext> {
    return request<ChatContext>(`/chats/${id}/context`);
  },

  clearContext(id: string): Promise<null> {
    return request<null>(`/chats/${id}/context`, { method: 'DELETE' });
  },

  remove(id: string): Promise<null> {
    return request<null>(`/chats/${id}`, { method: 'DELETE' });
  },
};

// ── RAG ───────────────────────────────────────────────────────────────────────

export const rag = {
  ask(question: string, opts: { chatId?: string; workspaceId?: string } = {}): Promise<AskResponse> {
    return jsonRequest<AskResponse>('/ask', 'POST', {
      question,
      chat_id: opts.chatId ?? null,
      workspace_id: opts.workspaceId ?? null,
    });
  },
};

// ── Carte des connaissances (React Flow) ─────────────────────────────────────

export interface MapNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    category: string;
    cluster: string;
    workspaceId?: string | null;
    views?: number;
    hasSummary?: boolean;
  };
  style?: Record<string, unknown>;
}

export interface MapEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
  data?: { score: number };
  style?: Record<string, unknown>;
}

export interface MapCluster {
  id: string;
  label: string;
  color: string;
  count: number;
  page_ids: string[];
}

export interface KnowledgeMap {
  nodes: MapNode[];
  edges: MapEdge[];
  clusters: MapCluster[];
}

export const knowledgeMap = {
  get(opts: { workspaceId?: string; minScore?: number; maxEdgesPerNode?: number } = {}): Promise<KnowledgeMap> {
    const params = new URLSearchParams();
    if (opts.workspaceId) params.set('workspace_id', opts.workspaceId);
    if (opts.minScore != null) params.set('min_score', String(opts.minScore));
    if (opts.maxEdgesPerNode != null) params.set('max_edges_per_node', String(opts.maxEdgesPerNode));
    const qs = params.toString();
    return request<KnowledgeMap>(`/knowledge-map${qs ? `?${qs}` : ''}`);
  },
};

// ── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  documents: number;
  workspaces: number;
  users: number;
  questions: number;
  never_viewed_pages: number;
}

export interface AnalyticsTopPage {
  id: string;
  title: string;
  category: string;
  workspace_id?: string | null;
  view_count: number;
  last_viewed_at?: string | null;
}

export interface AnalyticsTopUser {
  user_id: string;
  username: string;
  email: string;
  role: string;
  question_count: number;
}

export interface AnalyticsTopQuestion {
  question: string;
  count: number;
  avg_confidence?: number | null;
}

export interface AnalyticsFailedQuestion {
  question: string;
  confidence?: number | null;
  provider?: string | null;
  had_results: boolean;
  created_at?: string | null;
}

export interface AnalyticsMissingTopic {
  topic: string;
  occurrences: number;
  sample_question: string;
}

export interface AnalyticsQuestionsPerDay {
  date: string;
  count: number;
}

export interface SuperAdminDashboard {
  total_workspaces: number;
  total_users: number;
  active_users: number;
  total_documents: number;
  total_queries: number;
  disk_usage_bytes: number;
  providers: Record<string, number>;
  recent_errors: {
    question: string;
    confidence?: number | null;
    provider?: string | null;
    reason: string;
    created_at?: string | null;
  }[];
}

function wsQuery(workspaceId?: string, extra: Record<string, string | number> = {}): string {
  const params = new URLSearchParams();
  if (workspaceId) params.set('workspace_id', workspaceId);
  for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const analytics = {
  overview(workspaceId?: string): Promise<AnalyticsOverview> {
    return request<AnalyticsOverview>(`/analytics/overview${wsQuery(workspaceId)}`);
  },
  topPages(workspaceId?: string, limit = 10): Promise<AnalyticsTopPage[]> {
    return request<AnalyticsTopPage[]>(`/analytics/pages/top${wsQuery(workspaceId, { limit })}`);
  },
  topUsers(workspaceId?: string, limit = 10): Promise<AnalyticsTopUser[]> {
    return request<AnalyticsTopUser[]>(`/analytics/users/top${wsQuery(workspaceId, { limit })}`);
  },
  topQuestions(workspaceId?: string, limit = 10): Promise<AnalyticsTopQuestion[]> {
    return request<AnalyticsTopQuestion[]>(`/analytics/questions/top${wsQuery(workspaceId, { limit })}`);
  },
  failedQuestions(workspaceId?: string, limit = 20): Promise<AnalyticsFailedQuestion[]> {
    return request<AnalyticsFailedQuestion[]>(`/analytics/questions/failed${wsQuery(workspaceId, { limit })}`);
  },
  questionsPerDay(workspaceId?: string, days = 30): Promise<AnalyticsQuestionsPerDay[]> {
    return request<AnalyticsQuestionsPerDay[]>(`/analytics/questions/per-day${wsQuery(workspaceId, { days })}`);
  },
  providers(workspaceId?: string): Promise<Record<string, number>> {
    return request<Record<string, number>>(`/analytics/providers${wsQuery(workspaceId)}`);
  },
  missingTopics(workspaceId?: string, limit = 8): Promise<AnalyticsMissingTopic[]> {
    return request<AnalyticsMissingTopic[]>(`/analytics/missing-topics${wsQuery(workspaceId, { limit })}`);
  },
  superAdmin(): Promise<SuperAdminDashboard> {
    return request<SuperAdminDashboard>(`/analytics/super-admin`);
  },
};

// ── Audit de connaissance ────────────────────────────────────────────────────

export interface AuditStalePage {
  id: string;
  page: string;
  category?: string | null;
  workspace_id?: string | null;
  staleness_score: number;
  view_count: number;
  last_viewed?: string | null;
  updated_at?: string | null;
  never_viewed: boolean;
}

export interface AuditUnansweredGroup {
  topic: string;
  sample_question: string;
  occurrences: number;
  avg_score?: number | null;
  last_occurrence?: string | null;
}

export interface AuditUnindexedPage {
  id: string;
  page: string;
  category?: string | null;
  workspace_id?: string | null;
  reason: string;
  created_at?: string | null;
}

export interface AuditUnusedPage {
  id: string;
  page: string;
  category?: string | null;
  workspace_id?: string | null;
  workspace?: string | null;
  created_at?: string | null;
}

export interface AuditFlaggedPage {
  id: string;
  page: string;
  category?: string | null;
  workspace_id?: string | null;
  flag_count: number;
  flag_types: Record<string, number>;
  last_flagged_at?: string | null;
}

export interface AuditMissingKnowledge {
  topic: string;
  requests: number;
  priority: string;
  sample_question: string;
}

export interface AuditHealthScore {
  score: number;
  details: {
    stale_pages: number;
    unanswered_questions: number;
    unindexed_pages: number;
    flagged_pages: number;
  };
  penalties: {
    stale_pages: number;
    unanswered_questions: number;
    unindexed_pages: number;
    flagged_pages: number;
  };
}

export type FlagType = 'outdated' | 'incorrect' | 'duplicate' | 'missing_information';

export const audit = {
  health(workspaceId?: string): Promise<AuditHealthScore> {
    return request<AuditHealthScore>(`/audit/health${wsQuery(workspaceId)}`);
  },
  stalePages(workspaceId?: string, limit = 50, minScore = 0): Promise<AuditStalePage[]> {
    return request<AuditStalePage[]>(
      `/audit/pages/stale${wsQuery(workspaceId, { limit, min_score: minScore })}`,
    );
  },
  unanswered(workspaceId?: string, limit = 20): Promise<AuditUnansweredGroup[]> {
    return request<AuditUnansweredGroup[]>(`/audit/questions/unanswered${wsQuery(workspaceId, { limit })}`);
  },
  unindexed(workspaceId?: string, limit = 100): Promise<AuditUnindexedPage[]> {
    return request<AuditUnindexedPage[]>(`/audit/pages/unindexed${wsQuery(workspaceId, { limit })}`);
  },
  unused(workspaceId?: string, limit = 100): Promise<AuditUnusedPage[]> {
    return request<AuditUnusedPage[]>(`/audit/pages/unused${wsQuery(workspaceId, { limit })}`);
  },
  flagged(workspaceId?: string, limit = 100): Promise<AuditFlaggedPage[]> {
    return request<AuditFlaggedPage[]>(`/audit/pages/flagged${wsQuery(workspaceId, { limit })}`);
  },
  missingTopics(workspaceId?: string, limit = 8): Promise<AuditMissingKnowledge[]> {
    return request<AuditMissingKnowledge[]>(`/audit/missing-topics${wsQuery(workspaceId, { limit })}`);
  },
  flag(pageId: string, flagType: FlagType): Promise<unknown> {
    return request(`/audit/pages/${pageId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag_type: flagType }),
    });
  },
  unflag(pageId: string, flagType?: FlagType): Promise<{ resolved: number; flag_count: number }> {
    const qs = flagType ? `?flag_type=${flagType}` : '';
    return request<{ resolved: number; flag_count: number }>(`/audit/pages/${pageId}/flag${qs}`, {
      method: 'DELETE',
    });
  },
};

export const api = { auth, pages, workspaces, users, imports, chats, rag, knowledgeMap, analytics, audit, getToken, setToken };
export default api;
