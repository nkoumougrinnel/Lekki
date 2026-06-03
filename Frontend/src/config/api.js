export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

export const TOKEN_KEY = 'lekki_token';

export const CATEGORIES_PAGES = [
  { key: null, label: 'Tous' },
  { key: 'rh', label: 'RH' },
  { key: 'technique', label: 'Technique' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'guides', label: 'Guides' },
];
