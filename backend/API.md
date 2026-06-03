# Lekki Wiki — API Reference MVP

> Base URL : `http://localhost:8000/api/v1`
> Auth : Bearer JWT requis sur toutes les routes sauf `/auth/register` et `/auth/login`

---

## Auth

| Méthode | Route | Params body | Rôle requis |
|---------|-------|-------------|-------------|
| `POST` | `/auth/register` | `email`, `username`, `password` | — |
| `POST` | `/auth/login` | `email`, `password` | — |
| `GET` | `/auth/me` | — | tout rôle |

**Logout** : pas d’endpoint backend. JWT stateless — le client supprime le token (localStorage / cookie). Une blacklist côté serveur n’est pas prévue au MVP.

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
**Note** : La création/modification déclenche automatiquement l'indexation RAG en arrière-plan.

---

## Recherche

| Méthode | Route | Params | Rôle requis |
|---------|-------|--------|-------------|
| `GET` | `/pages/search` | `?q=` (requis, min 1 char) | lecteur+ |

L'endpoint utilise **SQLite FTS5**. La recherche est effectuée sur le titre et le contenu. Les résultats sont classés par pertinence (`rank`).

---

## RAG — Chatbot

| Méthode | Route | Params body | Rôle requis |
|---------|-------|-------------|-------------|
| `POST` | `/ask` | `question`, `chat_id` (optionnel) | lecteur+ |

Si `chat_id` est fourni : vérifier `chat.user_id == current_user.id` avant d’ajouter le message.

---

## Chats

| Méthode | Route | Params | Rôle requis |
|---------|-------|--------|-------------|
| `GET` | `/chats` | — | tout rôle |
| `GET` | `/chats/{id}` | `id` (path) | tout rôle |
| `POST` | `/chats` | `title` | tout rôle |
| `DELETE` | `/chats/{id}` | `id` (path) | tout rôle |
| `GET` | `/chats/{id}/messages` | `id` (path) · `?limit=` | tout rôle |

**Propriété** : pour toute route sur `/chats/{id}` (lecture, suppression, messages), le backend doit vérifier `chat.user_id == current_user.id`. Sinon `403 Forbidden`. `GET /chats` ne retourne que les chats de l’utilisateur connecté.

---

## Embeddings (interne)

> Non exposé au frontend. Déclenché automatiquement après `POST /pages` ou `PUT /pages/{id}` par le service documentaire (appel in-process ou HTTP interne).

| Méthode | Route | Params body | Accès |
|---------|---------------------|-------------|-------|
| `POST` | `/internal/embed/{page_id}` | — | clé interne uniquement |
| `DELETE` | `/internal/embed/{page_id}` | `page_id` (path) | service interne uniquement |

**Protection** : Authentification via l'en-tête `X-Internal-Key`.

---

## Users (admin)

| Méthode | Route | Params | Rôle requis |
|---------|-------|--------|-------------|
| `GET` | `/users` | `?page=` · `?limit=` | admin |
| `GET` | `/users/{id}` | `id` (path) | admin |
| `PUT` | `/users/{id}/role` | `id` (path) · `role` | admin |
| `DELETE` | `/users/{id}` | `id` (path) | admin |

**`PUT /users/{id}/role`**

- Réservé au rôle `admin` (middleware + contrôle handler).
- Interdit si `id == current_user.id` : un admin ne peut pas modifier son propre rôle (évite de se rétrograder et de perdre tous les admins). Réponse `403` avec message explicite.
- `role` ∈ `admin` · `editor` · `reader`.

**`DELETE /users/{id}`**

- Réservé au rôle `admin`.
- Interdit si `id == current_user.id` : un admin ne peut pas supprimer son propre compte. Réponse `403`.

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
| Auth | 3 |
| Pages | 5 |
| Recherche | 1 |
| RAG | 1 |
| Chats | 5 |
| Embeddings (interne) | 2 |
| Users | 4 |
| **Total** | **21** |
