# Lekki Wiki — Référence API HTTP

> **Base URL** : `http://localhost:8000/api/v1`  
> **Documentation interactive** : `http://localhost:8000/docs`  
> **Format** : JSON (sauf login en `application/x-www-form-urlencoded`)

Légende : **✓ Implémenté** · **○ Planifié** (tables ou spec prêtes, route absente)

---

## Authentification

### En-tête commun (routes protégées)

```http
Authorization: Bearer <access_token>
```

### Bypass développement ✓

```http
Authorization: Bearer dev
```

Connecte automatiquement `admin@lekki.local`. À désactiver en production.

---

## Auth

### `POST /auth/login` ✓

Authentification OAuth2 password flow (form-urlencoded).

| Champ | Type | Description |
|-------|------|-------------|
| `username` | string | Email **ou** nom d’utilisateur |
| `password` | string | Mot de passe |

**Exemple — curl (Linux / macOS / WSL)**

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@lekki.local&password=lekki123"
```

**Exemple — PowerShell**

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/v1/auth/login" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "username=admin@lekki.local&password=lekki123"
```

**Réponse 200**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "a0000000-0000-4000-8000-000000000001",
    "username": "admin",
    "email": "admin@lekki.local",
    "role": "admin"
  }
}
```

**Erreurs**

| Code | Détail |
|------|--------|
| `401` | Identifiants incorrects |

---

### `GET /auth/me` ✓

Profil de l’utilisateur connecté. **JWT requis.**

**Réponse 200**

```json
{
  "id": "a0000000-0000-4000-8000-000000000001",
  "username": "admin",
  "email": "admin@lekki.local",
  "role": "admin",
  "created_at": "2026-06-03T12:00:00"
}
```

---

### `POST /auth/register` ○

| Champ | Type |
|-------|------|
| `email` | string |
| `username` | string |
| `password` | string |

**Non implémenté** — comptes créés via `python -m scripts.seed` uniquement.

---

### Déconnexion

Pas d’endpoint backend. JWT stateless : le client supprime le token (`localStorage`, etc.).

---

## Pages

Toutes les routes ci-dessous nécessitent un **JWT valide** (sauf bypass `dev`).

### Modèle `PageResponse`

```json
{
  "id": "uuid",
  "title": "string",
  "content": "markdown",
  "category": "rh | technique | commercial | guides",
  "status": "published",
  "is_embedded": true,
  "view_count": 0,
  "creator_id": "uuid",
  "created_at": "datetime",
  "updated_at": "datetime | null"
}
```

---

### `GET /pages/` ✓

Liste paginée.

| Query | Type | Défaut | Description |
|-------|------|--------|-------------|
| `category` | enum | — | Filtre catégorie |
| `skip` | int | `0` | Offset |
| `limit` | int | `20` | Max 100 |

**Rôles** : `admin`, `editor`, `reader`

**Réponse 200** : `PageResponse[]`

---

### `GET /pages/search` ✓

Recherche full-text FTS5.

| Query | Type | Description |
|-------|------|-------------|
| `q` | string | Requis, min. 1 caractère |

**Rôles** : tous authentifiés

**Réponse 200** : `PageResponse[]` (pertinence FTS `rank`)

---

### `GET /pages/{id}` ✓

**Rôles** : tous authentifiés

**Réponse 200** : `PageResponse`  
**Erreurs** : `404` page introuvable

---

### `POST /pages/` ✓

Création d’une page. Déclenche **FTS5 + embedding Gemini** en arrière-plan.

**Rôles** : `admin`, `editor`

**Corps**

```json
{
  "title": "Ma page",
  "content": "## Contenu\n\nTexte markdown.",
  "category": "technique"
}
```

**Réponse 201** : `PageResponse`

**Erreurs** : `403` rôle insuffisant · `422` validation Pydantic

---

### `PUT /pages/{id}` ✓

Mise à jour partielle.

**Rôles** : `admin`, ou `editor` **uniquement sur ses propres pages**

**Corps** (tous champs optionnels)

```json
{
  "title": "Nouveau titre",
  "content": "...",
  "category": "rh",
  "status": "draft"
}
```

**Réponse 200** : `PageResponse`  
**Erreurs** : `403` editor sur page d’un autre · `404`

---

### `DELETE /pages/{id}` ✓

**Rôles** : `admin` uniquement

**Réponse 204** (sans corps)  
**Erreurs** : `404`

---

## RAG — Chatbot

### `POST /ask` ✓

Pose une question au wiki. Pipeline : embedding requête → top 4 chunks (cosinus) → génération Gemini.

**Auth** : aucune pour l’instant (○ JWT planifié)

**Corps**

```json
{
  "question": "Comment déployer avec Docker ?"
}
```

**Réponse 200 — succès**

```json
{
  "answer": "Pour déployer, exécutez docker compose up -d depuis la racine...",
  "sources": [
    "b0000000-0000-4000-8000-000000000002"
  ]
}
```

**Réponse 200 — aucun contexte**

```json
{
  "answer": "Je n'ai trouvé aucune information dans le wiki pour répondre à votre question.",
  "sources": []
}
```

**Erreurs**

| Code | Cause typique |
|------|----------------|
| `500` | `GEMINI_API_KEY` manquante ou modèle API indisponible |

**Champs planifiés (non renvoyés aujourd’hui)**

- `confidence` (score de confiance)
- `sources[]` enrichies (`title`, `chunk_text`, `similarity_score`)
- `chat_id`, `message_id` (persistance)

---

## Chats ○

Tables `chats` et `messages` présentes en base. **Routes non implémentées.**

| Méthode | Route | Statut |
|---------|-------|--------|
| `GET` | `/chats` | ○ |
| `GET` | `/chats/{id}` | ○ |
| `POST` | `/chats` | ○ |
| `DELETE` | `/chats/{id}` | ○ |
| `GET` | `/chats/{id}/messages` | ○ |

Règles prévues :

- `GET /chats` : uniquement les chats de `current_user`
- Routes `/{id}` : `chat.user_id == current_user.id` sinon `403`

Corps attendu `POST /chats` : `{ "title": "..." }`

---

## Embeddings (interne)

### `POST /internal/embed/{page_id}` ✓

Force la ré-indexation RAG d’une page (chunking + embeddings Gemini).

**Auth** : en-tête requis

```http
X-Internal-Key: lekki-internal-secret-key
```

(Valeur par défaut ; surcharge via variable d’environnement `INTERNAL_API_KEY`.)

**Réponse 200**

```json
{
  "status": "success",
  "page_id": "uuid",
  "chunks_created": 2
}
```

**Erreurs**

| Code | Détail |
|------|--------|
| `401` | Clé interne invalide |
| `404` | Page introuvable |

> L’indexation est aussi déclenchée automatiquement sur `POST /pages/` et `PUT /pages/{id}`.

### `DELETE /internal/embed/{page_id}` ○

Suppression des chunks d’une page — **non implémenté**.

---

## Users (admin) ○

| Méthode | Route | Statut |
|---------|-------|--------|
| `GET` | `/users` | ○ |
| `GET` | `/users/{id}` | ○ |
| `PUT` | `/users/{id}/role` | ○ |
| `DELETE` | `/users/{id}` | ○ |

Règles prévues :

- `PUT /users/{id}/role` : interdit si `id == current_user.id`
- `DELETE /users/{id}` : interdit de supprimer son propre compte
- `role` ∈ `admin` · `editor` · `reader`

---

## Rôles

| Rôle | Valeur API | Description |
|------|------------|-------------|
| Administrateur | `admin` | CRUD complet, suppression pages |
| Éditeur | `editor` | Création ; modification de **ses** pages |
| Lecteur | `reader` | Lecture et recherche uniquement |

---

## Codes HTTP courants

| Code | Signification |
|------|----------------|
| `200` | Succès |
| `201` | Ressource créée |
| `204` | Succès sans corps (DELETE) |
| `401` | Non authentifié / token invalide |
| `403` | Rôle ou propriété insuffisante |
| `404` | Ressource introuvable |
| `422` | Erreur de validation (Pydantic) |
| `500` | Erreur serveur (JSON : `detail`, `type`, `message`) |

---

## Récapitulatif des endpoints

| # | Méthode | Route | Statut |
|---|---------|-------|--------|
| 1 | `POST` | `/auth/login` | ✓ |
| 2 | `GET` | `/auth/me` | ✓ |
| 3 | `POST` | `/auth/register` | ○ |
| 4 | `GET` | `/pages/` | ✓ |
| 5 | `GET` | `/pages/search` | ✓ |
| 6 | `GET` | `/pages/{id}` | ✓ |
| 7 | `POST` | `/pages/` | ✓ |
| 8 | `PUT` | `/pages/{id}` | ✓ |
| 9 | `DELETE` | `/pages/{id}` | ✓ |
| 10 | `POST` | `/ask` | ✓ |
| 11 | `GET` | `/chats` | ○ |
| 12 | `GET` | `/chats/{id}` | ○ |
| 13 | `POST` | `/chats` | ○ |
| 14 | `DELETE` | `/chats/{id}` | ○ |
| 15 | `GET` | `/chats/{id}/messages` | ○ |
| 16 | `POST` | `/internal/embed/{page_id}` | ✓ |
| 17 | `DELETE` | `/internal/embed/{page_id}` | ○ |
| 18 | `GET` | `/users` | ○ |
| 19 | `GET` | `/users/{id}` | ○ |
| 20 | `PUT` | `/users/{id}/role` | ○ |
| 21 | `DELETE` | `/users/{id}` | ○ |

**Hors préfixe `/api/v1`**

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/` | Accueil |
| `GET` | `/health` | Santé `{"status":"ok"}` |

---

## Comptes de démo (seed)

Mot de passe par défaut : `lekki123` (ou `SEED_PASSWORD` dans `.env`).

| Email | Rôle |
|-------|------|
| admin@lekki.local | admin |
| editor@lekki.local | editor |
| reader@lekki.local | reader |

Voir [README.md](./README.md) pour l’installation, le pipeline RAG Gemini et le dépannage.
