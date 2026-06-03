import { API_BASE_URL, TOKEN_KEY } from '../config/api';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

export const parseErreurApi = async (response) => {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((e) => e.msg ?? String(e)).join(', ');
    }
  } catch {
    /* corps non JSON */
  }
  return `Erreur ${response.status}`;
};

export async function apiFetch(chemin, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body = options.body;
  if (body !== undefined && body !== null && !(body instanceof URLSearchParams) && !(body instanceof FormData)) {
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${chemin}`, { ...options, headers, body });

  if (!response.ok) {
    const message = await parseErreurApi(response);
    const erreur = new Error(message);
    erreur.status = response.status;
    throw erreur;
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();
  return null;
}
