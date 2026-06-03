# Lekki Wiki — Base de connaissances d'entreprise avec RAG

> **« Notre RAG ne devine pas — il cite. »**
> Un wiki Markdown-first avec un assistant IA (**Lekki AI**) qui source chaque réponse, garde les données sur votre infrastructure (SQLite local), et se déploie en une commande Docker.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Fonctionnalités actuelles](#fonctionnalités-actuelles)
3. [Architecture](#architecture)
4. [Stack technique](#stack-technique)
5. [Installation et démarrage](#installation-et-démarrage)
6. [Configuration](#configuration)
7. [Structure du projet](#structure-du-projet)
8. [Référence API](#référence-api)
9. [Pipeline RAG](#pipeline-rag)
10. [Comptes & données de démo](#comptes--données-de-démo)

---

## Vue d'ensemble

Lekki Wiki combine une gestion documentaire Markdown et un pipeline RAG (Retrieval-Augmented Generation). L'assistant **Lekki AI** répond aux questions à partir du contenu du wiki, **cite ses sources** (cliquables, elles ouvrent la page dans l'éditeur) et affiche un **score de confiance**. Les embeddings sont calculés **en local** par défaut (MiniLM), avec bascule possible vers Gemini ; aucun document ne quitte votre infrastructure si vous restez sur le modèle local.

**Conçu pour :** équipes RH, techniques et commerciales — tout contexte où l'information est dispersée.

---

## Fonctionnalités actuelles

### Authentification & rôles

- Inscription, connexion et profil via **JWT** (HS256), mots de passe hachés avec **bcrypt**.
- Connexion par **email ou nom d'utilisateur**.
- Trois rôles : **admin**, **editor**, **reader**.
  - `reader` : lecture seule.
  - `editor` : crée des pages, modifie **ses propres** pages.
  - `admin` : tout, y compris suppression de pages et gestion des utilisateurs.
- Contexte d'authentification côté front (`AuthProvider`/`AuthGate`), token persisté en `localStorage`, écran de connexion dédié.

### Gestion des pages (wiki)

- **CRUD complet** des pages Markdown (création, lecture, mise à jour, suppression) selon le rôle.
- **Catégories** : `rh`, `technique`, `commercial`, `guides`.
- **Statut** : `draft` (brouillon / « Privé ») ou `published` (« Public »).
- **Éditeur Markdown** en vue scindée **édition / aperçu** en direct, avec **titre éditable** et bouton d'enregistrement (lecture seule pour les `reader`).
- **Recherche plein-texte** (SQLite FTS5) exposée dans la barre de recherche **centrée** de l'en-tête (résultats en direct, déboncés).
- **Compteur de vues** et indicateur d'indexation (`is_embedded`) par page.

### Sidebar (style explorateur VS Code)

- Sections : **Favoris** (étoile dorée), **Privés**, **Groupes** *(à venir)*, **Publics**.
- **Favoris** gérés côté client (`localStorage`), étoile dorée par page pour ajouter/retirer.
- Boutons d'ajout rapide de page (au survol des sections, + barre d'outils en haut), suppression de page pour les rôles autorisés.

### Assistant IA — Lekki AI

- Chat connecté au endpoint `**POST /ask`** (RAG réel).
- **Sources cliquables** : chaque réponse liste les pages utilisées (titre + score) ; un clic **ouvre la page dans l'éditeur**.
- **Score de confiance** affiché (basé sur la similarité cosinus du meilleur passage).
- **Détection des salutations / small-talk** : répond poliment sans interroger inutilement le RAG.
- Réponses **sans emoji**, message clair quand aucune information n'est trouvée.
- Panneau refermable et **bouton flottant** pour le rouvrir.

### Pipeline RAG & fournisseurs

- **Chunking** via LangChain `RecursiveCharacterTextSplitter` (512 / overlap 64, séparateurs Markdown).
- **Embeddings** stockés en base (vecteurs `float32`), recherche par **similarité cosinus** (top-4).
- **Fournisseurs d'embeddings** avec bascule : **MiniLM** (`all-MiniLM-L6-v2`, local, sans clé) puis **Gemini** (fallback).
- **Fournisseurs LLM** avec **failover automatique** et cooldown sur quota/429 : **Gemini → Groq → Cerebras**.
- Endpoints d'état : `GET /llm/status` et `GET /embedding/status`.

### Conversations

- Historique de conversations par utilisateur (`/chats`), persistance des messages et de leurs sources (JSON).

### Administration

- Gestion des utilisateurs réservée aux admins : liste, consultation, **changement de rôle**, suppression (protections anti auto-modification).

### UI / UX

- **React + Vite + TailwindCSS** avec composants shadcn/ui et icônes lucide-react.
- **Mode clair / sombre** (clair par défaut), contrastes corrigés.
- **Barre de défilement** discrète accordée au thème.
- Rendu Markdown des réponses via **Streamdown**.

### Déploiement

- **Docker Compose** : services `backend` (FastAPI/Uvicorn) + `frontend` (build Vite servi par **Nginx**), volume persistant pour la base SQLite, healthcheck backend.

---

## Architecture

```
Utilisateur pose une question (Lekki AI)
        │
        ▼
Frontend  ──►  POST /api/v1/ask  { question, chat_id? }
        │
        ▼
RAG (rag_service + llm_service) :
  1. Si salutation/small-talk  →  réponse conviviale (pas de RAG)
  2. Embedding de la question (MiniLM local, sinon Gemini)
  3. Similarité cosinus sur les chunks (top-4)
  4. Construction des sources (page_id, titre, extrait, score)
  5. Score de confiance = meilleure similarité
  6. Appel LLM avec failover (Gemini → Groq → Cerebras)
        │
        ▼
{ answer, sources: [{ page_id, title, excerpt, score }], confidence, provider }
        │
        ▼
Frontend affiche la réponse + sources cliquables (ouvrent la page)
```

**Ingestion (script d'indexation)**

```
Page Markdown → Chunking (512 / overlap 64)
   → Embedding (MiniLM local / Gemini) → table `chunks` (vecteurs float32)
   → FTS5 (pages_fts) pour la recherche plein-texte
```

---

## Stack technique

### Backend


| Composant        | Technologie                                                    |
| ---------------- | -------------------------------------------------------------- |
| Framework API    | FastAPI + Uvicorn (préfixe `/api/v1`)                          |
| Base de données  | SQLite + SQLAlchemy **async**, migrations **Alembic**          |
| Recherche texte  | SQLite **FTS5** (`pages_fts`)                                  |
| Embeddings       | `sentence-transformers` **all-MiniLM-L6-v2** (local) / Gemini  |
| Découpage RAG    | `langchain-text-splitters`                                     |
| LLM              | **Gemini** (`google-genai`), **Groq**, **Cerebras** (failover) |
| Authentification | JWT HS256 (python-jose) + passlib/bcrypt                       |


### Frontend


| Composant        | Technologie                  |
| ---------------- | ---------------------------- |
| Framework        | React 18 + TypeScript (Vite) |
| Styles & UI      | TailwindCSS + shadcn/ui      |
| Icônes           | lucide-react                 |
| Rendu Markdown   | Streamdown                   |
| Gestionnaire pkg | pnpm                         |
| État / contextes | React Context (auth, thème)  |


### Infrastructure

- **Docker Compose** (backend + frontend), **Nginx** pour servir le SPA en production.
- **SQLite WAL** : pas de serveur de base à gérer, données dans un volume.

---

## Installation et démarrage

### Prérequis

- Docker ≥ 24 et Docker Compose ≥ 2.20, **ou**
- Python 3.11+ et Node 20+ (+ `pnpm`) pour le développement local.

### Option A — Docker (recommandé)

```bash
# À la racine du projet
# (optionnel) renseigner les clés LLM dans backend/.env
docker compose up --build
```

- **Frontend** → [http://localhost:3000](http://localhost:3000)
- **API** → [http://localhost:8000](http://localhost:8000)
- **Swagger UI** → [http://localhost:8000/docs](http://localhost:8000/docs)

### Option B — Développement local

```bash
# 1) Backend (depuis backend/)
cd backend
python -m venv .venv
# Windows : .venv\Scripts\activate   |   Linux/macOS : source .venv/bin/activate
pip install -r requirements.txt

# Configurer l'environnement
copy .env.example .env        # Windows   (cp .env.example .env sur Linux/macOS)
# Renseigner au moins une clé LLM (GEMINI_API_KEY, GROQ_API_KEY ou CEREBRAS_API_KEY)

# Données de démo puis indexation RAG
python -m scripts.seed
python -m scripts.index_rag

# Lancer l'API
uvicorn app.main:app --reload --port 8000
```

```bash
# 2) Frontend (depuis Frontend/client/, autre terminal)
cd Frontend/client
pnpm install
pnpm dev          # http://localhost:5173
```

> Le frontend lit `VITE_API_URL` (par défaut `http://localhost:8000/api/v1`).

---

## Configuration

Variables d'environnement du backend (`backend/.env`) :

```env
# Sécurité
SECRET_KEY=change-this-in-production
DEBUG=true
SEED_PASSWORD=lekki123

# Ordre de bascule LLM (/ask) : gemini → groq → cerebras
LLM_PROVIDER_ORDER=gemini,groq,cerebras
LLM_PROVIDER_COOLDOWN_MINUTES=60

# Gemini
GEMINI_API_KEY=...
GEMINI_LLM_MODEL=models/gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=models/gemini-embedding-001

# Groq (optionnel)
GROQ_API_KEY=
GROQ_LLM_MODEL=llama-3.1-8b-instant
GROQ_BASE_URL=https://api.groq.com/openai/v1

# Cerebras (optionnel)
CEREBRAS_API_KEY=
CEREBRAS_LLM_MODEL=llama-3.3-70b
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1

# Embeddings : minilm (local, défaut) puis gemini (fallback)
EMBEDDING_PROVIDER_ORDER=minilm,gemini
LOCAL_EMBEDDING_MODEL=all-MiniLM-L6-v2

# Interne
INTERNAL_API_KEY=lekki-internal-secret-key
```

Frontend (`Frontend/.env`) :

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## Structure du projet

```
Lekki/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI, CORS, routers (/api/v1)
│   │   ├── config.py               # Settings (pydantic-settings)
│   │   ├── database.py             # SQLite async, migrations, get_db
│   │   ├── models/                 # user, page, chunk, chat, permission
│   │   ├── schemas/                # Pydantic (auth, page, user, chat, rag)
│   │   ├── routers/                # auth, pages, rag, chats, users, internal
│   │   ├── middleware/             # auth, rôles, protection (clé interne)
│   │   ├── utils/                  # CRUD pages / chats
│   │   └── services/
│   │       ├── rag_service.py      # chunking, embeddings, cosinus, sources
│   │       ├── llm_service.py      # orchestration LLM
│   │       ├── auth_service.py     # JWT, hash, dépendances de rôle
│   │       ├── embedding_providers/ # router, minilm, gemini
│   │       └── llm_providers/      # router, gemini, groq, cerebras
│   ├── scripts/
│   │   ├── seed.py                 # comptes + pages de démo (upsert + FTS)
│   │   ├── seed_pages.py           # contenu Markdown des pages de démo
│   │   └── index_rag.py            # indexation RAG (embeddings)
│   ├── requirements.txt
│   └── Dockerfile
├── Frontend/
│   ├── client/
│   │   └── src/
│   │       ├── App.tsx             # layout, auth gate, CRUD, ouverture sources
│   │       ├── components/         # SidebarV2, HeaderV2, MarkdownEditorV2,
│   │       │                       # AIPanel (Lekki AI), DashboardV2, LoginScreen
│   │       ├── contexts/           # AuthContext, ThemeContext
│   │       ├── lib/api.ts          # client API (auth, pages, rag)
│   │       └── types/wiki.ts
│   ├── Dockerfile                  # build Vite + Nginx
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## Référence API

Toutes les routes sont préfixées par `/api/v1`. Documentation interactive sur `/docs`.

### Authentification

```
POST   /api/v1/auth/register     { email, username, password } → { access_token, user }
POST   /api/v1/auth/login        (form: username, password)    → { access_token, user }
GET    /api/v1/auth/me           → profil de l'utilisateur courant
```

### Pages

```
GET    /api/v1/pages             ?category=&skip=&limit=        (authentifié)
GET    /api/v1/pages/search      ?q=<texte>                     (FTS, authentifié)
GET    /api/v1/pages/{id}
POST   /api/v1/pages             { title, content, category }   (admin, editor)
PUT    /api/v1/pages/{id}        (admin ; editor → ses pages)
DELETE /api/v1/pages/{id}        (admin)
```

### Assistant (RAG)

```
POST   /api/v1/ask               { question, chat_id? }
       → { answer, sources: [{ page_id, title, excerpt, score }], confidence, provider }
GET    /api/v1/llm/status        état des fournisseurs LLM
GET    /api/v1/embedding/status  état des fournisseurs d'embeddings
```

### Conversations

```
GET    /api/v1/chats
POST   /api/v1/chats             { title }
GET    /api/v1/chats/{id}
DELETE /api/v1/chats/{id}
GET    /api/v1/chats/{id}/messages   ?limit=
```

### Utilisateurs (admin)

```
GET    /api/v1/users/
GET    /api/v1/users/{id}
PUT    /api/v1/users/{id}/role   { role }
DELETE /api/v1/users/{id}
```

### Exemple (PowerShell)

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/v1/auth/login" -H "Content-Type: application/x-www-form-urlencoded" -d "username=admin@lekki.local&password=lekki123"
# Puis :
curl.exe -H "Authorization: Bearer <token>" "http://127.0.0.1:8000/api/v1/auth/me"
```

---

## Pipeline RAG

### Découpage (chunking)

```python
RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=64,
    separators=["\n## ", "\n### ", "\n\n", "\n", " "],
)
```

### Embeddings

```
all-MiniLM-L6-v2  (local, 384 dimensions, sans clé API)  →  fallback Gemini
Vecteurs stockés en float32 dans la table `chunks`.
```

### Recherche & confiance

```
Similarité cosinus entre la requête et chaque chunk  →  top-4
confidence = meilleure similarité (borné [0, 1])
```

### Réindexation après modification de contenu

```bash
cd backend
python -m scripts.seed        # rafraîchit le contenu des pages de démo + FTS
python -m scripts.index_rag   # recalcule les embeddings de toutes les pages
```

---

## Comptes & données de démo

`python -m scripts.seed` crée 3 comptes (mot de passe : valeur de `SEED_PASSWORD`, par défaut `lekki123`) et 7 pages wiki :


| Compte                                          | Rôle   |
| ----------------------------------------------- | ------ |
| [admin@lekki.local](mailto:admin@lekki.local)   | admin  |
| [editor@lekki.local](mailto:editor@lekki.local) | editor |
| [reader@lekki.local](mailto:reader@lekki.local) | reader |


Pages de démo : Politique de congés · Onboarding · Remboursement des frais · Charte IT · Guide télétravail · Recrutement interne · Architecture technique (Stack Lekki).

### Questions de démo recommandées

- *« Combien de jours de congés payés par an ? »*
- *« Que faire le premier jour d'onboarding ? »*
- *« Quel est le plafond repas client ? »*
- *« Quelle est la longueur minimale d'un mot de passe ? »*
- *« Combien de jours de télétravail par semaine ? »*

> Après le seed, lancez `**python -m scripts.index_rag*`* pour que l'assistant puisse répondre.

