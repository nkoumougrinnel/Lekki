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
- **Éditeur Markdown** ouvert en **aperçu par défaut** ; bascule **Aperçu / Édition** via un commutateur compact flottant dans le document (la barre d'outils Markdown n'apparaît qu'en mode édition). Titre éditable, enregistrement (icône) et **lecture seule** pour les `reader`.
- **Résumé TL;DR** (bouton « Résumer ») et **pages liées** (3 meilleurs voisins sémantiques, sur une ligne défilante) intégrés à l'en-tête du document.
- **Recherche plein-texte** (SQLite FTS5) dans la barre de recherche **centrée** de l'en-tête (résultats en direct, débouncés, liste déroulante à **hauteur limitée et défilante**).
- **Compteur de vues** et indicateur d'indexation (`is_embedded`) par page.

### Sidebar (style explorateur VS Code)

- Sections : **Favoris** (icône étoile), **Privés**, **Groupes** *(à venir)*, **Publics**.
- **Favoris** gérés côté client (`localStorage`), **icône étoile** par page pour ajouter/retirer.
- **Création rapide** : le bouton **+** de la barre d'outils crée une page **privée (brouillon) par défaut** ; un **+** au survol des sections « Privés » / « Publics » crée la page dans la section ciblée.
- **Suppression** réservée aux rôles autorisés, avec **pop-up de confirmation** accessible (plus d'`alert` natif).

### Assistant IA — Lekki AI

- Chat connecté au endpoint `**POST /ask`** (RAG réel).
- **Sources cliquables** : chaque réponse liste les pages utilisées (titre + score) ; un clic **ouvre la page dans l'éditeur**.
- **Animation « token par token »** : la réponse s'écrit progressivement (effet machine à écrire) pour un rendu vivant.
- **Score de confiance** présenté en **badge coloré par niveau** (élevée / moyenne / faible) et **sources en cartes** avec barre de pertinence — révélés une fois la réponse écrite.
- **Détection des salutations / small-talk** : répond poliment sans interroger inutilement le RAG.
- Réponses **sans emoji**, message clair quand aucune information n'est trouvée.
- Panneau refermable et **bouton flottant** pour le rouvrir.

### Pipeline RAG & fournisseurs

- **Chunking** via LangChain `RecursiveCharacterTextSplitter` (512 / overlap 64, séparateurs Markdown).
- **Embeddings** stockés en base (vecteurs `float32`), recherche par **similarité cosinus** (top-4).
- **Fournisseurs d'embeddings** avec bascule : **MiniLM** (`all-MiniLM-L6-v2`, local, sans clé) puis **Gemini** (fallback).
- **Fournisseurs LLM** gérés par un service centralisé (`LLMProviderManager`) avec **rotation de clés API**, **failover automatique** et **cache des fournisseurs défaillants** (cooldown) : **Gemini → Groq → Cerebras → Ollama** (dernier recours).
- Endpoints d'état : `GET /system/llm-status`, `GET /llm/status` et `GET /embedding/status`.

#### Gestion des fournisseurs LLM (failover + rotation de clés)

`LLMProviderManager` essaie, dans l'ordre `LLM_PROVIDER_ORDER`, **chaque clé** de chaque
fournisseur cloud, puis **Ollama** uniquement si tout le cloud a échoué :

1. **Rotation de clés** : `GEMINI_API_KEYS`, `GROQ_API_KEYS`, `CEREBRAS_API_KEYS` (liste JSON
  ou valeurs séparées par virgules ; la clé unique `*_API_KEY` reste prise en compte). En cas
   de quota / rate-limit / timeout / erreur réseau, on bascule sur la **clé suivante**, puis sur
   le **fournisseur suivant**.
2. **Cache de cooldown** : une clé en échec transitoire n'est pas réessayée pendant
  `LLM_KEY_COOLDOWN_MINUTES` (5 min par défaut).
3. **Ollama = filet de sécurité** : utilisé seulement en dernier recours, avec un **modèle léger**
  (`llama3.2:3b` / `qwen2.5:3b`) et des paramètres **frugaux** (`temperature=0.1`, `top_p=0.7`,
   `num_predict=256`, `num_ctx=1024`). Si `OLLAMA_ENABLED=false`, une **erreur propre** (503) est
   renvoyée quand tout le cloud est indisponible — l'utilisateur ne voit jamais d'erreur brute de quota.
4. **Logs détaillés** (sans dévoiler la clé) :

```
[LLM] Gemini key #2 failed : RateLimit
[LLM] Switching to Gemini key #3
[LLM] Gemini key #3 failed : QuotaExceeded
[LLM] Switching to Groq
[LLM] Groq success in 1.2s
```

`GET /system/llm-status` renvoie la santé synthétique :

```json
{ "gemini": "available", "groq": "available", "cerebras": "available", "ollama": "fallback" }
```

### Conversations

- Historique de conversations par utilisateur (`/chats`), persistance des messages et de leurs sources (JSON).

### Administration

- Gestion des utilisateurs réservée aux admins : liste, consultation, **changement de rôle**, suppression (protections anti auto-modification).

### UI / UX

- **React + Vite + TailwindCSS** avec composants shadcn/ui et icônes lucide-react.
- **Mode clair / sombre** (clair par défaut) : palette claire retravaillée pour une vraie hiérarchie de profondeur (canevas teinté, surfaces blanches, bordures visibles, texte secondaire lisible).
- **Shell responsive** : sidebar en tiroir et panneau IA en plein écran sur mobile (`useMobile`), colonnes fixes sur grand écran.
- **Accessibilité** : les vues plein écran (Analytics, Audit, Carte des connaissances) et les confirmations utilisent de **vrais dialogues Radix** (focus-trap + ARIA), pas d'overlays bricolés.
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
│   │       └── llm_providers/      # manager (failover + rotation clés), gemini, groq, cerebras, ollama
│   ├── scripts/
│   │   ├── seed.py                 # comptes + pages de démo (upsert + FTS)
│   │   ├── seed_pages.py           # contenu Markdown des pages de démo
│   │   └── index_rag.py            # indexation RAG (embeddings)
│   ├── requirements.txt
│   └── Dockerfile
├── Frontend/
│   ├── client/
│   │   └── src/
│   │       ├── App.tsx             # layout responsive, auth gate, CRUD, ouverture sources
│   │       ├── components/         # Sidebar, Header, MarkdownEditor, Dashboard,
│   │       │                       # AIPanel (Lekki AI), AnalyticsDashboard,
│   │       │                       # AuditDashboard, KnowledgeMapDialog,
│   │       │                       # ImportDialog, WorkspaceSwitcher, LoginScreen, ui/
│   │       ├── contexts/           # AuthContext, ThemeContext, WorkspaceContext
│   │       ├── hooks/              # useMobile (shell responsive)
│   │       ├── lib/api.ts          # client API (auth, pages, rag, workspaces, audit…)
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
POST   /api/v1/pages/{id}/summarize  ?force=   → { summary, summary_at, cached, provider }
GET    /api/v1/pages/{id}/summary                → résumé existant (ou summary null)
GET    /api/v1/pages/{id}/related    ?limit=     → [{ page_id, title, category, score }]
```

**Résumé automatique (TL;DR)** : `POST /pages/{id}/summarize` envoie le contenu Markdown au
LLM (bascule Gemini → Groq → Cerebras) pour produire un TL;DR de 5 à 8 lignes, stocké dans
`pages.summary` / `pages.summary_at`. Si un résumé existe déjà, il est renvoyé tel quel
(`cached: true`) — passez `?force=true` pour le régénérer.

**Pages liées (voisins sémantiques)** : à l'indexation, le vecteur de chaque page (moyenne
normalisée des embeddings de ses chunks) sert à calculer les similarités cosinus ; les **5
meilleurs voisins** sont stockés dans la table `page_relations` (`page_id`, `related_id`,
`score`, `computed_at`). `GET /pages/{id}/related` renvoie titre, catégorie et score, en
**excluant toujours les pages d'un workspace inaccessible** à l'utilisateur. Le graphe est
recalculé automatiquement après indexation, import et création/édition de page.

### Assistant (RAG)

```
POST   /api/v1/ask               { question, chat_id? }
       → { answer, sources: [{ page_id, title, excerpt, score }], confidence, provider }
GET    /api/v1/llm/status         état détaillé des fournisseurs LLM (clés, cooldown)
GET    /api/v1/system/llm-status  santé synthétique des fournisseurs (authentifié)
GET    /api/v1/embedding/status   état des fournisseurs d'embeddings
```

### Conversations

```
GET    /api/v1/chats
POST   /api/v1/chats             { title }
GET    /api/v1/chats/{id}
DELETE /api/v1/chats/{id}
GET    /api/v1/chats/{id}/messages   ?limit=
GET    /api/v1/chats/{id}/context    # derniers échanges injectés dans le prompt
DELETE /api/v1/chats/{id}/context    # réinitialise la mémoire de la conversation
```

**Mémoire conversationnelle** : lors d'une question avec `chat_id`, le RAG récupère les
**4 derniers échanges** et les injecte dans le prompt, ce qui permet les questions de suivi
(« et pour eux ? », « combien ? ») sans répéter le contexte. La taille est bornée
(max. 4 échanges, ~600 caractères/message, ~3000 au total) pour éviter l'explosion des
tokens. Le contexte respecte les permissions workspace et peut être effacé via
`DELETE /chats/{id}/context`.

### Analytics d'usage

```
GET    /api/v1/analytics/overview            ?workspace_id=        KPI (docs, workspaces, users, questions)
GET    /api/v1/analytics/pages/top           ?workspace_id=&limit= top pages consultées
GET    /api/v1/analytics/pages/never-viewed  ?workspace_id=&limit= pages jamais consultées
GET    /api/v1/analytics/users/top           ?workspace_id=&limit= utilisateurs actifs
GET    /api/v1/analytics/questions/top       ?workspace_id=&limit= questions fréquentes
GET    /api/v1/analytics/questions/failed    ?workspace_id=&limit= questions sans réponse (conf<0.3 ou had_results=false)
GET    /api/v1/analytics/questions/per-day   ?workspace_id=&days=  série temporelle (graphe)
GET    /api/v1/analytics/providers           ?workspace_id=        usage des fournisseurs IA
GET    /api/v1/analytics/missing-topics      ?workspace_id=&limit= sujets manquants (différenciant)
GET    /api/v1/analytics/super-admin                               dashboard global (Super Admin)
```

Chaque appel à `POST /ask` est **tracé** dans la table `rag_queries` (utilisateur,
workspace, question, confidence, provider, duration_ms, had_results). Chaque ouverture de
page incrémente `view_count` et met à jour `last_viewed_at`.

**Cloisonnement** : un Workspace Admin (propriétaire ou membre `owner`/`admin`) ne voit que
les workspaces qu'il gère ; le Super Admin (`role = admin`) accède à tout via `?workspace_id`
ou en vue globale. **Missing topics** analyse les questions sans réponse, regroupe les
mots-clés significatifs et suggère les sujets à documenter — mis en avant dans le dashboard.

### Audit de connaissance

```
GET    /api/v1/audit/health                ?workspace_id=        Knowledge Health Score (0-100) + détails
GET    /api/v1/audit/pages/stale           ?workspace_id=&min_score=&limit=  pages obsolètes (score d'obsolescence)
GET    /api/v1/audit/questions/unanswered  ?workspace_id=&limit= questions sans réponse regroupées par sujet
GET    /api/v1/audit/pages/unindexed       ?workspace_id=&limit= pages sans chunks/embeddings
GET    /api/v1/audit/pages/unused          ?workspace_id=&limit= documents jamais consultés (view_count = 0)
GET    /api/v1/audit/pages/flagged         ?workspace_id=&limit= pages signalées (non résolues)
POST   /api/v1/audit/pages/{id}/flag       body {flag_type}      signaler une page
DELETE /api/v1/audit/pages/{id}/flag       ?flag_type=           résoudre les signalements d'une page
GET    /api/v1/audit/missing-topics        ?workspace_id=&limit= connaissances manquantes + priorité
```

L'audit analyse automatiquement la **qualité de la base documentaire** :

- **Pages obsolètes** : `staleness_score` = 40 % ancienneté (`updated_at`) + 40 % absence de
consultation (`last_viewed_at`) + 20 % faible fréquence d'usage (`view_count`).
- **Questions sans réponse** : `rag_queries` avec `confidence < 0.30` ou `had_results = false`,
regroupées par mot-clé dominant (occurrences, dernière occurrence, score moyen).
- **Pages non indexées** : aucune chunk, chunks sans embeddings ou `is_embedded = false`.
- **Pages signalées** : table `page_flags` (`outdated`, `incorrect`, `duplicate`,
`missing_information`) ; `pages.flag_count` suit les signalements non résolus.
- **Knowledge Health Score** : `100 − pénalités` (pages obsolètes, questions sans réponse,
pages non indexées, pages signalées), chaque pénalité plafonnée.
- **Connaissances manquantes** : sujets fréquemment demandés sans réponse, classés par
priorité (`high`/`medium`/`low`) — la recommandation actionnable mise en avant.

**Sécurité** : Workspace Admin restreint à ses workspaces, utilisateur standard sans accès
(403). Côté frontend, le tableau de bord d'audit (icône bouclier) porte désormais
**uniquement sur le workspace actif** — le sélecteur de portée globale Super Admin a été
retiré de l'UI (les endpoints restent toutefois interrogeables sans `workspace_id`).

### Carte des connaissances

```
GET    /api/v1/knowledge-map     ?workspace_id=&min_score=&max_edges_per_node=   (authentifié)
```

Retourne un graphe **compatible React Flow** : `nodes`, `edges`, `clusters`.

- **nodes** : une page accessible = un nœud (`id`, `position {x, y}`, `data {label, category, cluster, views}`, `style` coloré par thématique).
- **edges** : liens **déduits automatiquement** des similarités sémantiques (table
`page_relations`, cosinus entre embeddings), dédupliqués et bornés par `max_edges_per_node` ;
`min_score` filtre les liens faibles.
- **clusters** : regroupement thématique par catégorie (RH, Technique, Commercial, Guides),
avec label, couleur et nombre de pages.

Sécurité : seules les pages des workspaces accessibles (ou sans workspace) apparaissent, et
aucun lien ne pointe vers une page d'un workspace inaccessible. Côté frontend, un bouton
« Carte des connaissances » (en-tête) ouvre un graphe interactif (zoom, déplacement,
glisser-déposer des nœuds, clic pour ouvrir une page, légende des thématiques).

### Utilisateurs (admin)

```
GET    /api/v1/users/
GET    /api/v1/users/{id}
PUT    /api/v1/users/{id}/role   { role }
DELETE /api/v1/users/{id}
```

### Workspaces

```
POST   /api/v1/workspaces                       { name, description? }       (authentifié, créateur = owner)
GET    /api/v1/workspaces                        → workspaces de l'utilisateur
GET    /api/v1/workspaces/{id}                   (membre uniquement)
GET    /api/v1/workspaces/{id}/members           (membre uniquement)
POST   /api/v1/workspaces/{id}/members           { user_id, role? }          (owner/admin du workspace)
DELETE /api/v1/workspaces/{id}/members/{user_id} (owner/admin du workspace)
```

**Cloisonnement (isolation des données)** : chaque page, chunk RAG et conversation porte
un `workspace_id`. Un utilisateur ne voit que les pages et chats de ses workspaces, et la
recherche vectorielle (`POST /ask`) filtre les chunks **avant** la similarité cosinus
selon les workspaces de l'utilisateur connecté. Un membre du seul workspace RH ne peut
donc jamais récupérer d'information du workspace Technique, y compris via le chatbot RAG.
Un administrateur global (`role = admin`) a accès à tous les workspaces.

### Import documentaire

```
POST   /api/v1/imports          (multipart: files[], workspace_id, category?)   (admin, editor)
       → 202 { id, status, total_files, processed_files, progress, ... }
GET    /api/v1/imports           → imports de l'utilisateur
GET    /api/v1/imports/{id}       → progression d'un import
```

Formats acceptés : **PDF, DOCX, TXT, Markdown**. À l'upload, le texte est extrait, une
**page** est créée dans le workspace ciblé, puis le pipeline RAG (chunking + embeddings)
est lancé **automatiquement en tâche de fond** (FastAPI `BackgroundTasks`). Le document
devient ainsi immédiatement consultable par l'assistant, **sans exécuter de script
manuel**. La progression se suit via `GET /imports/{id}` (champ `progress` en %).

Exemple (PowerShell) :

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/v1/imports" `
  -H "Authorization: Bearer <token>" `
  -F "workspace_id=c0000000-0000-4000-8000-000000000002" `
  -F "files=@C:\chemin\vers\document.pdf"
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

> Après le seed, lancez `**python -m scripts.index_rag`** pour que l'assistant puisse répondre.

