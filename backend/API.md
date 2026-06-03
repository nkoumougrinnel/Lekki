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

Pose une question au wiki et, si `chat_id` est fourni, enregistre la paire user/assistant dans `messages`.

**Pipeline** : embedding requête (Gemini) → top 4 chunks (cosinus) → génération avec **bascule** `gemini` → `groq` → `cerebras`.

**Auth** : aucune pour l’instant (○ JWT planifié)

**Corps**

```json
{
  "question": "Comment déployer avec Docker ?",
  "chat_id": "b0000000-0000-4000-8000-000000000010"
}
```

| Champ | Requis | Description |
|-------|--------|-------------|
| `question` | oui | Texte de la question (min. 1 caractère) |
| `chat_id` | non | UUID d'une conversation existante (`chats.id`). **JWT requis** si présent. Deux lignes créées dans `messages`. |

**Réponse 200 — succès**

```json
{
  "message_id": "c0000000-0000-4000-8000-000000000021",
  "user_message_id": "c0000000-0000-4000-8000-000000000020",
  "answer": "Pour déployer, exécutez docker compose up -d depuis la racine...",
  "sources": [
    {
      "page_id": "b0000000-0000-4000-8000-000000000002",
      "excerpt": "Pour déployer l'application, exécutez docker compose up -d…",
      "score": 0.8724
    }
  ],
  "confidence": 0.8724,
  "provider": "gemini"
}
```

| Champ | Description |
|-------|-------------|
| `message_id` | ID du message **assistant** (`messages.id`), `null` si pas de `chat_id` |
| `user_message_id` | ID du message **user**, `null` si pas de `chat_id` |
| `answer` | Texte généré (lu aussi comme `content` côté front) |
| `sources` | Pages citées — une entrée par `page_id` (score max), format aligné sur `messages.sources` |
| `confidence` | Score sémantique **0–1** (meilleur cosinus des chunks retenus) ; le front l’affiche en % |
| `provider` | Fournisseur ayant répondu : `gemini`, `groq` ou `cerebras` |

**Persistance base**

Lorsque `chat_id` est fourni :

| Colonne | Message user | Message assistant |
|---------|--------------|-------------------|
| `chat_id` | FK vers `chats.id` | idem |
| `role` | `user` | `assistant` |
| `content` | `question` | `answer` |
| `sources` | `null` | JSON `[{page_id, excerpt, score}]` |
| `tokens_used` | estimation (`len` mots) | idem |

**Réponse 200 — aucun contexte**

```json
{
  "message_id": "c0000000-0000-4000-8000-000000000021",
  "user_message_id": "c0000000-0000-4000-8000-000000000020",
  "answer": "Je n'ai trouvé aucune information dans le wiki pour répondre à votre question.",
  "sources": [],
  "confidence": 0.0,
  "provider": null
}
```

**Erreurs**

| Code | Cause typique |
|------|----------------|
| `404` | `chat_id` inconnu |
| `401` | `chat_id` fourni sans JWT |
| `403` | `chat_id` appartient à un autre utilisateur |
| `422` | `question` vide ou corps invalide |
| `503` | Quota / erreur sur tous les fournisseurs **configurés** |
| `500` | Erreur non gérée (vérifier logs serveur) |

**Réponse 503 — tous fournisseurs indisponibles**

```json
{
  "detail": {
    "message": "Tous les fournisseurs LLM sont indisponibles (quota ou erreur).",
    "errors": [
      ["gemini", "429 RESOURCE_EXHAUSTED..."],
      ["groq", "cooldown actif (quota précédent)"]
    ]
  }
}
```

**Intégration frontend** (`envoyerMessageChat`)

```javascript
// Envoi
POST /ask  →  { question, chat_id }

// Champs lus
message_id      → id message assistant
user_message_id → id message user (optionnel UI)
answer          → content affiché
sources         → citations (excerpt / page_id)
confidence      → × 100 pour le badge %
```

---

### `GET /llm/status` ✓

État des fournisseurs de génération (debug, monitoring).

**Auth** : aucune

**Réponse 200**

```json
{
  "providers": [
    {"name": "gemini", "configured": true, "in_cooldown": false},
    {"name": "groq", "configured": true, "in_cooldown": false},
    {"name": "cerebras", "configured": false, "in_cooldown": false}
  ]
}
```

| Champ | Description |
|-------|-------------|
| `configured` | Clé API présente dans `.env` |
| `in_cooldown` | Quota / 429 récent — fournisseur temporairement ignoré |

---

## Chats ✓

Conversations RAG liées à l'utilisateur connecté. Tables `chats` et `messages`.

**Auth** : JWT requis sur toutes les routes (`Authorization: Bearer <token>`)

### `GET /chats` ✓

Liste les conversations de l'utilisateur connecté, triées par `updated_at` décroissant (la plus récente en premier — utilisée par `recupererHistoriqueChat`).

**Réponse 200**

```json
[
  {
    "id": "b0000000-0000-4000-8000-000000000010",
    "title": "Comment déployer ?",
    "user_id": "a0000000-0000-4000-8000-000000000001",
    "created_at": "2026-06-03T10:00:00",
    "updated_at": "2026-06-03T10:05:00"
  }
]
```

**Erreurs** : `401` si non authentifié

---

### `POST /chats` ✓

Crée une conversation.

**Corps**

```json
{
  "title": "Nouvelle conversation"
}
```

**Réponse 201**

```json
{
  "id": "b0000000-0000-4000-8000-000000000010",
  "title": "Nouvelle conversation",
  "user_id": "a0000000-0000-4000-8000-000000000001",
  "created_at": "2026-06-03T10:00:00",
  "updated_at": "2026-06-03T10:00:00"
}
```

| Champ | Description |
|-------|-------------|
| `title` | Titre affiché (1–200 caractères). Le front tronque la question à 80 caractères. |

**Erreurs** : `401`, `422` (titre vide)

---

### `GET /chats/{id}` ✓

Détail d'une conversation.

**Réponse 200** : même schéma qu'un élément de `GET /chats`

**Erreurs**

| Code | Cause |
|------|-------|
| `401` | Non authentifié |
| `403` | Conversation d'un autre utilisateur |
| `404` | ID inconnu |

---

### `DELETE /chats/{id}` ✓

Supprime la conversation et ses messages (cascade SQL).

**Réponse 204** (sans corps)

**Erreurs** : `401`, `403`, `404`

---

### `GET /chats/{id}/messages` ✓

Historique des messages d'une conversation, ordre chronologique.

**Query**

| Param | Défaut | Description |
|-------|--------|-------------|
| `limit` | `50` | Nombre max de messages (1–100) |

**Réponse 200**

```json
[
  {
    "id": "c0000000-0000-4000-8000-000000000020",
    "chat_id": "b0000000-0000-4000-8000-000000000010",
    "role": "user",
    "content": "Combien de jours de congés ?",
    "sources": null,
    "tokens_used": 5,
    "created_at": "2026-06-03T10:01:00"
  },
  {
    "id": "c0000000-0000-4000-8000-000000000021",
    "chat_id": "b0000000-0000-4000-8000-000000000010",
    "role": "assistant",
    "content": "Selon la politique interne, 25 jours...",
    "sources": "[{\"page_id\": \"...\", \"excerpt\": \"...\", \"score\": 0.97}]",
    "tokens_used": 58,
    "created_at": "2026-06-03T10:01:05"
  }
]
```

| Champ | Description |
|-------|-------------|
| `role` | `user` ou `assistant` |
| `sources` | JSON string (messages assistant) — parsé par `normaliserMessage` côté front |
| `content` | Texte du message |

**Erreurs** : `401`, `403`, `404`

**Intégration frontend**

```javascript
// Historique au chargement
GET /chats                          → chats[0] = conversation active
GET /chats/{id}/messages?limit=50   → messages affichés

// Nouvelle question
POST /chats  →  { title }         → nouveau.id
POST /ask     →  { question, chat_id: nouveau.id }
```

---

## Embeddings (interne)

### `POST /internal/embed/{page_id}` ✓

Force la ré-indexation RAG d’une page (chunking + embeddings MiniLM local, fallback Gemini).

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

### `DELETE /internal/embed/{page_id}` ✓

Suppression des chunks d’une page — **non implémenté**.

---

## Users (admin) ✓

| Méthode | Route | Statut |
|---------|-------|--------|
| `GET` | `/users` | ✓ |
| `GET` | `/users/{id}` | ✓ |
| `PUT` | `/users/{id}/role` | ✓ |
| `DELETE` | `/users/{id}` | ✓ |

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
| `503` | Tous les fournisseurs LLM indisponibles (`POST /ask`) |

---

## Récapitulatif des endpoints

| # | Méthode | Route | Statut |
|---|---------|-------|--------|
| 1 | `POST` | `/auth/login` | ✓ |
| 2 | `GET` | `/auth/me` | ✓ |
| 3 | `POST` | `/auth/register` | ✓ |
| 4 | `GET` | `/pages/` | ✓ |
| 5 | `GET` | `/pages/search` | ✓ |
| 6 | `GET` | `/pages/{id}` | ✓ |
| 7 | `POST` | `/pages/` | ✓ |
| 8 | `PUT` | `/pages/{id}` | ✓ |
| 9 | `DELETE` | `/pages/{id}` | ✓ |
| 10 | `POST` | `/ask` | ✓ |
| 11 | `GET` | `/llm/status` | ✓ |
| 11b | `GET` | `/embedding/status` | ✓ |
| 12 | `GET` | `/chats` | ✓ |
| 13 | `GET` | `/chats/{id}` | ✓ |
| 14 | `POST` | `/chats` | ✓ |
| 15 | `DELETE` | `/chats/{id}` | ✓ |
| 16 | `GET` | `/chats/{id}/messages` | ✓ |
| 17 | `POST` | `/internal/embed/{page_id}` | ✓ |
| 18 | `DELETE` | `/internal/embed/{page_id}` | ✓ |
| 19 | `GET` | `/users` | ✓ |
| 20 | `GET` | `/users/{id}` | ✓ |
| 21 | `PUT` | `/users/{id}/role` | ✓ |
| 22 | `DELETE` | `/users/{id}` | ✓ |

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

Voir [README.md](./README.md) (architecture, bascule LLM) et [TESTING.md](./TESTING.md) (procédure de tests).
