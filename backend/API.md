# Lekki Wiki — API Reference MVP

> Base URL : `http://localhost:8000/api/v1`
> Auth : Bearer JWT requis sur toutes les routes sauf `/auth/*`

---

## Auth

| Méthode | Route | Params body | Rôle requis |
|---------|-------|-------------|-------------|
| `POST` | `/auth/register` | `email`, `username`, `password` | — |
| `POST` | `/auth/login` | `email`, `password` | — |
| `POST` | `/auth/logout` | — | tout rôle |
| `GET` | `/auth/me` | — | tout rôle |

---

## Pages

| Méthode | Route | Params | Rôle requis |
|---------|-------|--------|-------------|
| `GET` | `/pages` | `?category=`, `?page=`, `?limit=` | lecteur+ |
| `GET` | `/pages/{id}` | `id` (path) | lecteur+ |
| `POST` | `/pages` | `title`, `content`, `category` | éditeur+ |
| `PUT` | `/pages/{id}` | `id` (path) · `title`, `content`, `category` | éditeur+ |
| `DELETE` | `/pages/{id}` | `id` (path) | admin |

**Catégories valides** : `rh` · `technique` · `commercial` · `guides`

---

## Recherche

| Méthode | Route | Params | Rôle requis |
|---------|-------|--------|-------------|
| `GET` | `/search` | `?q=` (requis) · `?category=` · `?limit=` | lecteur+ |

---

## RAG — Chatbot

| Méthode | Route | Params body | Rôle requis |
|---------|-------|-------------|-------------|
| `POST` | `/ask` | `question`, `chat_id` (optionnel) | lecteur+ |

---

## Chats

| Méthode | Route | Params | Rôle requis |
|---------|-------|--------|-------------|
| `GET` | `/chats` | — | tout rôle |
| `GET` | `/chats/{id}` | `id` (path) | tout rôle |
| `POST` | `/chats` | `title` | tout rôle |
| `DELETE` | `/chats/{id}` | `id` (path) | tout rôle |
| `GET` | `/chats/{id}/messages` | `id` (path) · `?limit=` | tout rôle |

---

## Embeddings (interne)

> Appelé automatiquement par le backend à chaque `POST /pages` ou `PUT /pages/{id}`. Non exposé au frontend.

| Méthode | Route | Params body | Rôle requis |
|---------|-------|-------------|-------------|
| `POST` | `/internal/embed` | `page_id` | admin (service interne) |
| `DELETE` | `/internal/embed/{page_id}` | `page_id` (path) | admin (service interne) |

---

## Users (admin)

| Méthode | Route | Params | Rôle requis |
|---------|-------|--------|-------------|
| `GET` | `/users` | `?page=` · `?limit=` | admin |
| `GET` | `/users/{id}` | `id` (path) | admin |
| `PUT` | `/users/{id}/role` | `id` (path) · `role` | admin |
| `DELETE` | `/users/{id}` | `id` (path) | admin |

---

## Codes de rôle

| Rôle | Valeur |
|------|--------|
| Administrateur | `admin` |
| Éditeur | `editor` |
| Lecteur | `reader` |

---

## Résumé des endpoints (21 au total)

| Module | Count |
|--------|-------|
| Auth | 4 |
| Pages | 5 |
| Recherche | 1 |
| RAG | 1 |
| Chats | 5 |
| Embeddings (interne) | 2 |
| Users | 4 |
| **Total** | **22** |