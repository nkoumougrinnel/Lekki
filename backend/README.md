# Lekki Wiki — Documentation Backend

API REST **FastAPI** pour un wiki d’entreprise Markdown avec **RAG** (Retrieval-Augmented Generation). Les documents et vecteurs restent en **SQLite** local ; les appels distants passent par **Gemini** (embeddings + génération par défaut), avec **bascule automatique** vers **Groq** puis **Cerebras** si quota ou indisponibilité.

---

## Table des matières

1. [Vue d’ensemble](#vue-densemble)
2. [Stack technique](#stack-technique)
3. [Architecture](#architecture)
4. [Structure du projet](#structure-du-projet)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Base de données](#base-de-données)
8. [Authentification et rôles](#authentification-et-rôles)
9. [Pages et recherche FTS5](#pages-et-recherche-fts5)
10. [Pipeline RAG](#pipeline-rag)
11. [Bascule LLM (Gemini → Groq → Cerebras)](#bascule-llm-gemini--groq--cerebras)
12. [API HTTP](#api-http)
13. [Scripts et tests](#scripts-et-tests)
14. [Dépannage](#dépannage)
15. [Feuille de route](#feuille-de-route)

---

## Vue d’ensemble

| Élément | Détail |
|---------|--------|
| **Préfixe API** | `/api/v1` |
| **Port par défaut** | `8000` |
| **Base URL locale** | `http://127.0.0.1:8000/api/v1` |
| **Swagger** | `http://127.0.0.1:8000/docs` |
| **Santé** | `GET /health` → `{"status":"ok"}` |

**Fonctionnalités livrées**

- Authentification JWT (`login`, `me`)
- CRUD pages wiki protégé par rôles
- Recherche full-text SQLite FTS5
- Indexation RAG automatique à la création/mise à jour de page
- Question/réponse via `POST /ask` (retrieval cosinus + génération multi-fournisseurs)
- **Bascule LLM** : Gemini → Groq → Cerebras (cooldown après quota)
- Monitoring `GET /llm/status` (clés configurées, cooldown)
- Route interne de ré-indexation (`/internal/embed`)

**Prévu en base (tables) mais routes non exposées**

- Historique chats (`chats`, `messages`)
- Inscription (`/auth/register`)
- Administration utilisateurs (`/users`)

Référence détaillée des endpoints : **[API.md](./API.md)**.

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | FastAPI + Uvicorn |
| ORM | SQLAlchemy 2 (async, `aiosqlite`) |
| Base | SQLite (`data/wiki.db`) |
| Migrations | Alembic (`migrations/`) |
| Validation | Pydantic v2 + `pydantic-settings` |
| Auth | JWT HS256 (`python-jose`), mots de passe `bcrypt` |
| Embeddings | Gemini `models/gemini-embedding-001` (extensible via `EMBEDDING_PROVIDER_ORDER`) |
| Génération | Bascule : Gemini `gemini-2.0-flash` · Groq `llama-3.1-8b-instant` · Cerebras `llama-3.3-70b` |
| HTTP clients | `google-genai`, `httpx` (Groq / Cerebras, API OpenAI-compatible) |
| Chunking | `langchain-text-splitters` (512 tokens, overlap 64) |
| Recherche lexicale | SQLite FTS5 (`pages_fts`) |
| Recherche sémantique | Similarité cosinus en mémoire sur blobs float32 |

---

## Architecture

```
Client (Frontend / curl / test_api.py)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  FastAPI (app/main.py)                                    │
│  • CORS localhost:5173, :3000                             │
│  • Lifespan → init_db() → alembic upgrade head            │
│  • Handler 500 global → JSON                                │
└───────────────────────────────────────────────────────────┘
        │
        ├── /api/v1/auth     → auth.py
        ├── /api/v1/pages    → pages.py  → utils/pages.py
        ├── /api/v1/ask         → rag.py → embedding router + LLMProviderRouter
        ├── /api/v1/llm/status  → rag.py → état fournisseurs
        └── /api/v1/internal    → internal.py → embed_page
                    │
                    ▼
        ┌───────────────────────┐     ┌──────────────────────────────┐
        │  SQLite (wiki.db)     │     │  APIs distantes (bascule)     │
        │  users, pages, chunks │◄───►│  1. Gemini  2. Groq  3. Cerebras│
        │  pages_fts (FTS5)     │     └──────────────────────────────┘
        └───────────────────────┘
```

### Flux création de page

1. `POST /pages/` → validation JWT + rôle `admin` ou `editor`
2. Insertion table `pages`
3. Sync FTS5 (`INSERT INTO pages_fts`)
4. `rag_service.embed_page()` : découpage → appels Gemini embedding → stockage `chunks.embedding` (BLOB)
5. `db.refresh(page)` → réponse `PageResponse`

### Flux question RAG (`POST /ask`)

1. Embedding de la question (Gemini, tâche `RETRIEVAL_QUERY`)
2. Chargement de tous les `chunks` avec vecteur
3. Score cosinus, top **4** chunks
4. `LLMProviderRouter` : essaie **Gemini**, puis **Groq**, puis **Cerebras**
5. Réponse `{ answer, sources: [page_id, ...], provider: "groq" }`

> **Note** : `/ask` n’est pas encore protégé par JWT. Si tous les fournisseurs échouent → **503** avec détail des erreurs.

---

## Structure du projet

```
backend/
├── app/
│   ├── main.py                 # Entrée FastAPI, CORS, routers
│   ├── config.py               # Settings (.env)
│   ├── database.py             # Engine async, Alembic, get_db
│   ├── models/
│   │   ├── user.py             # User
│   │   ├── page.py             # Page
│   │   ├── chunk.py            # Chunk (+ embedding BLOB)
│   │   ├── chat.py             # Chat, Message
│   │   └── lekki_class_diagram.html
│   ├── schemas/
│   │   └── page.py             # PageCreate, PageUpdate, PageResponse
│   ├── routers/
│   │   ├── auth.py             # login, me
│   │   ├── pages.py            # CRUD + search
│   │   ├── rag.py              # /ask
│   │   └── internal.py         # /internal/embed
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── rag_service.py
│   │   ├── llm_service.py          # Prompt RAG + LLMProviderRouter
│   │   ├── llm_providers/          # gemini, groq, cerebras, router
│   │   └── embedding_providers/    # gemini, router
│   └── utils/
│       └── pages.py
├── tests/
│   ├── conftest.py
│   ├── test_models.py
│   ├── test_routes.py
│   └── test_llm_failover.py
├── migrations/
│   └── versions/
│       ├── 001_initial_mvp_schema.py
│       └── 002_embedding_and_fts5.py
├── scripts/
│   ├── seed.py
│   ├── test_api.py             # Intégration HTTP (serveur live)
│   └── test_llm_failover.py    # Bascule simulée (sans API)
├── data/
│   └── wiki.db                 # SQLite (gitignored)
├── alembic.ini
├── requirements.txt
├── .env.example
├── api_tests.http              # Requêtes REST Client (VS Code)
├── API.md
├── TESTING.md                  # Procédure complète des tests
└── README.md
```

Le dossier `alembic/versions/` duplique certaines migrations ; **seul `migrations/`** est utilisé (`alembic.ini` → `script_location = migrations`).

---

## Installation

**Prérequis** : Python 3.11+ (testé sur 3.12). Clés recommandées : [Gemini](https://aistudio.google.com/), [Groq](https://console.groq.com/), [Cerebras](https://cloud.cerebras.ai/) (au moins une pour `/ask` en production).

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Éditer .env : GEMINI_API_KEY et SECRET_KEY
```

---

## Configuration

Variables lues depuis `backend/.env` (via `pydantic-settings`).

| Variable | Défaut | Description |
|----------|--------|-------------|
| `SECRET_KEY` | *(à changer)* | Clé de signature JWT |
| `GEMINI_API_KEY` | `""` | Google AI Studio — embeddings + 1er essai génération |
| `GROQ_API_KEY` | `""` | [Groq](https://console.groq.com/) — 2e essai génération |
| `CEREBRAS_API_KEY` | `""` | [Cerebras](https://cloud.cerebras.ai/) — 3e essai génération |
| `LLM_PROVIDER_ORDER` | `gemini,groq,cerebras` | Ordre de bascule |
| `LLM_PROVIDER_COOLDOWN_MINUTES` | `60` | Pause après quota / 429 |
| `EMBEDDING_PROVIDER_ORDER` | `gemini` | Fournisseur(s) d’embeddings |
| `SEED_PASSWORD` | `lekki123` | Mot de passe des comptes créés par le seed |
| `DEBUG` | `false` | Mode debug applicatif |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` (8 h) | Durée de vie du JWT |
| `DATABASE_URL` | `sqlite+aiosqlite:///.../data/wiki.db` | URL async SQLAlchemy |
| `SYNC_DATABASE_URL` | `sqlite:////.../data/wiki.db` | URL sync (Alembic) |
| `INTERNAL_API_KEY` | `lekki-internal-secret-key` | Clé header `X-Internal-Key` |

Exemple minimal `.env` :

Voir **[.env.example](./.env.example)** pour la liste complète (modèles, URLs Groq/Cerebras).

> `config.py` déclare `DATABASE_URL=sqlite:///./lekki.db` mais **`database.py` prime** avec `data/wiki.db` si la variable d’environnement n’est pas définie. Toujours lancer Uvicorn depuis `backend/`.

---

## Base de données

### Fichier

`backend/data/wiki.db` (créé automatiquement, à ajouter au `.gitignore`).

### Migrations Alembic

| Révision | Contenu |
|----------|---------|
| `001` | `users`, `pages`, `chunks`, `chats`, `messages` |
| `002` | Colonne `chunks.embedding` (BLOB) + table virtuelle `pages_fts` (FTS5) |

Au démarrage, `init_db()` appelle `run_migrations()` :

- Si les tables MVP existent sans `alembic_version` → **stamp** `head`
- Si `table already exists` → **stamp** `head`
- Sinon → `alembic upgrade head`

Commandes manuelles (depuis `backend/`) :

```bash
alembic upgrade head
alembic current
alembic downgrade -1
```

### Modèle de données

```
User (1) ──< Page (N)     creator_id
Page (1) ──< Chunk (N)    page_id, embedding
User (1) ──< Chat (N)     user_id
Chat (1) ──< Message (N)  chat_id
```

| Table | Champs notables |
|-------|-----------------|
| **users** | `email`, `username`, `password_hash`, `role` (`admin` \| `editor` \| `reader`) |
| **pages** | `title`, `content`, `category`, `status`, `is_embedded`, `view_count`, `creator_id` |
| **chunks** | `chunk_index`, `chunk_text`, `chunk_hash`, `token_count`, `embedding` |
| **chats** | `title`, `user_id` |
| **messages** | `role`, `content`, `sources` (JSON string), `tokens_used` |
| **pages_fts** | Table virtuelle FTS5 : `title`, `content`, `page_id` (UNINDEXED) |

**Catégories de pages** : `rh`, `technique`, `commercial`, `guides`.

### Seed (données de démo)

```bash
python -m scripts.seed
```

Idempotent : ne fait rien si un utilisateur existe déjà.

| Compte | Email | Rôle | ID fixe |
|--------|-------|------|---------|
| admin | admin@lekki.local | admin | `a0000000-0000-4000-8000-000000000001` |
| editor | editor@lekki.local | editor | `a0000000-0000-4000-8000-000000000002` |
| reader | reader@lekki.local | reader | `a0000000-0000-4000-8000-000000000003` |

+ 3 pages exemple et indexation FTS5 des pages seedées.

---

## Authentification et rôles

### Login

`POST /api/v1/auth/login` — corps **form-urlencoded** (OAuth2) :

- `username` : email **ou** pseudo
- `password` : mot de passe en clair

Réponse :

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": { "id": "...", "username": "...", "email": "...", "role": "admin" }
}
```

### Utilisation du token

```http
Authorization: Bearer <access_token>
```

### Bypass développement

`Authorization: Bearer dev` → utilisateur `admin@lekki.local` sans vérifier le JWT. **À retirer en production** (`auth_service.py`).

### Matrice des permissions (pages)

| Action | admin | editor | reader |
|--------|:-----:|:------:|:------:|
| Lire / lister / rechercher | ✓ | ✓ | ✓ |
| Créer | ✓ | ✓ | ✗ |
| Modifier | ✓ | ✓ (ses pages) | ✗ |
| Supprimer | ✓ | ✗ | ✗ |

---

## Pages et recherche FTS5

### CRUD

Géré par `app/utils/pages.py` et exposé via `app/routers/pages.py`. Toutes les routes pages exigent un JWT valide (sauf si vous utilisez le bypass `dev`).

**Pagination** : `GET /pages/?skip=0&limit=20&category=technique`

### Recherche

`GET /pages/search?q=Test`

- Requête FTS5 par préfixe : chaque mot devient `mot*`
- Tri par `rank` FTS5
- Erreurs FTS loguées côté serveur ; renvoie `[]` en cas d’échec

---

## Pipeline RAG

### Paramètres de chunking

```python
RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=64,
    separators=["\n## ", "\n### ", "\n\n", "\n", " "],
)
```

### Embeddings (fournisseur actuel : Gemini)

| Usage | Modèle | Module |
|-------|--------|--------|
| Document | `GEMINI_EMBEDDING_MODEL` | `embedding_providers/gemini.py` |
| Requête | idem | `EmbeddingProviderRouter` |

### Génération

Déléguée à **`LLMProviderRouter`** — voir section suivante.

### Stockage des vecteurs

- Format : `numpy.float32` sérialisé en **BLOB** SQLite
- Recherche : scan linéaire de tous les chunks (MVP, non optimisé pour gros volumes)

### Indexation automatique

Déclenchée dans `create_page` et `update_page` (erreurs loguées, n’interrompent pas le HTTP si l’exception est capturée).

### Ré-indexation manuelle

```http
POST /api/v1/internal/embed/{page_id}
X-Internal-Key: lekki-internal-secret-key
```

Réponse :

```json
{ "status": "success", "page_id": "...", "chunks_created": 3 }
```

### Prompt système (LLM)

Le modèle doit répondre **uniquement** à partir des chunks fournis ; sinon indiquer qu’il ne sait pas (`llm_service.py`).

---

## Bascule LLM (Gemini → Groq → Cerebras)

### Principe

```
POST /ask
  → EmbeddingProviderRouter (Gemini)
  → top 4 chunks (cosinus)
  → LLMProviderRouter.generate(prompt)
       1. gemini   — si clé + pas en cooldown
       2. groq     — si Gemini quota / 429
       3. cerebras — si Groq indisponible
  → { answer, sources, provider }
```

| Comportement | Détail |
|--------------|--------|
| **Quota / 429** | Fournisseur en **cooldown** (`LLM_PROVIDER_COOLDOWN_MINUTES`) |
| **Sans clé** | Fournisseur ignoré |
| **Échec total** | HTTP **503** + liste `errors` |
| **Succès** | Champ `provider` : `gemini`, `groq` ou `cerebras` |

### Fichiers

| Chemin | Rôle |
|--------|------|
| `app/services/llm_providers/gemini.py` | SDK `google.genai` (structure d’origine) |
| `app/services/llm_providers/groq.py` | API OpenAI-compatible Groq |
| `app/services/llm_providers/cerebras.py` | API OpenAI-compatible Cerebras |
| `app/services/llm_providers/router.py` | Orchestration et bascule |
| `app/services/llm_service.py` | Construction du prompt RAG |

### Monitoring

```http
GET /api/v1/llm/status
```

```json
{
  "providers": [
    {"name": "gemini", "configured": true, "in_cooldown": false},
    {"name": "groq", "configured": true, "in_cooldown": false},
    {"name": "cerebras", "configured": false, "in_cooldown": false}
  ]
}
```

---

## API HTTP

### Lancer le serveur

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

| URL | Description |
|-----|-------------|
| `/` | Accueil JSON |
| `/health` | Santé |
| `/docs` | Swagger UI |
| `/redoc` | ReDoc |
| `/api/v1/...` | API versionnée |

### Endpoints implémentés

| Méthode | Route | Auth | Statut |
|---------|-------|------|--------|
| `POST` | `/auth/login` | — | ✓ |
| `GET` | `/auth/me` | JWT | ✓ |
| `GET` | `/pages/` | JWT | ✓ |
| `GET` | `/pages/search` | JWT | ✓ |
| `GET` | `/pages/{id}` | JWT | ✓ |
| `POST` | `/pages/` | JWT admin/editor | ✓ |
| `PUT` | `/pages/{id}` | JWT admin/editor | ✓ |
| `DELETE` | `/pages/{id}` | JWT admin | ✓ |
| `POST` | `/ask` | — | ✓ (+ `provider`, bascule) |
| `GET` | `/llm/status` | — | ✓ |
| `POST` | `/internal/embed/{page_id}` | `X-Internal-Key` | ✓ |

Détail des requêtes, exemples curl/PowerShell et endpoints planifiés : **[API.md](./API.md)**.

---

## Scripts et tests

Documentation détaillée : **[TESTING.md](./TESTING.md)**.

### Résumé des commandes

| Commande | Description |
|----------|-------------|
| `pytest tests/ -v` | **47 tests** — modèles, routes, bascule (mocks), sans API |
| `python scripts/test_llm_failover.py` | Bascule simulée (6 scénarios, sans réseau) |
| `python scripts/test_api.py` | Intégration live (login, CRUD, embed, FTS5) — serveur requis |
| `python -m scripts.seed` | Données de démo |

```powershell
# Terminal 1
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2
pytest tests/ -v
python scripts/test_api.py
python scripts/test_llm_failover.py
```

### REST Client

Fichier `api_tests.http` — login, pages, embed, `/ask`, `/llm/status`.

---

## Dépannage

### `ModuleNotFoundError` / dépendances

```bash
pip install -r requirements.txt
```

`python-multipart` est requis pour `/auth/login`.

### `table users already exists`

```bash
alembic stamp head
```

ou supprimer `data/wiki.db` et relancer :

```bash
del data\wiki.db
alembic upgrade head
python -m scripts.seed
```

### Embedding 500 / modèle introuvable

Vérifier `GEMINI_API_KEY` et que les noms de modèles dans `rag_service.py` / `llm_service.py` existent pour votre clé (lister via SDK `client.models.list()`).

### FTS5 : 0 résultat

Vérifier que la migration `002` est appliquée et que la page a bien été indexée (`INSERT` dans `pages_fts` à la création).

### `MissingGreenlet` sur création de page

Corrigé par `db.refresh(page)` après embedding dans `utils/pages.py`. Redémarrer le serveur après mise à jour du code.

### Port 8000 occupé

```bash
uvicorn app.main:app --reload --port 8001
```

### Connexion refusée depuis le frontend

- Serveur démarré depuis `backend/`
- CORS : origines `http://localhost:5173` et `:3000` déjà autorisées
- URL frontend : `VITE_API_URL=http://localhost:8000/api/v1`

---

## Feuille de route

| Fonctionnalité | Statut |
|----------------|--------|
| `POST /auth/register` | Planifié |
| Routes `/chats/*` + persistance messages | Tables OK, routes à faire |
| JWT sur `POST /ask` | Planifié |
| `confidence` + sources enrichies (titre, extrait, score) | Planifié |
| `GET/PUT/DELETE /users` (admin) | Planifié |
| `DELETE /internal/embed/{page_id}` | Planifié |
| Vector store dédié (Chroma, etc.) | Hors scope MVP actuel |

---

## Fichiers de référence

- [API.md](./API.md) — Contrats HTTP, exemples, codes d’erreur
- [app/models/lekki_class_diagram.html](./app/models/lekki_class_diagram.html) — Diagramme de classes MVP
- [requirements.txt](./requirements.txt) — Dépendances Python
