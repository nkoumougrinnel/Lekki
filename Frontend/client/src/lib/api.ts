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
  created_at: string;
  updated_at?: string | null;
}

export interface AskSource {
  page_id: string;
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
  list(params: { category?: PageCategory; skip?: number; limit?: number } = {}): Promise<Page[]> {
    const search = new URLSearchParams();
    if (params.category) search.set('category', params.category);
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

  create(input: { title: string; content: string; category: PageCategory }): Promise<Page> {
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
};

// ── RAG ───────────────────────────────────────────────────────────────────────

export const rag = {
  ask(question: string, chatId?: string): Promise<AskResponse> {
    return jsonRequest<AskResponse>('/ask', 'POST', { question, chat_id: chatId ?? null });
  },
};

export const api = { auth, pages, rag, getToken, setToken };
export default api;
