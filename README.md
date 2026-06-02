# Lekki — Corporate Knowledge Base with RAG

> **"Notre RAG ne devine pas — il cite."**
> Une base de connaissances Markdown-first avec un moteur IA qui source chaque réponse, garde vos données sur votre infrastructure, et se déploie en une commande.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Fonctionnalités](#fonctionnalités)
3. [Architecture](#architecture)
4. [Stack technique](#stack-technique)
5. [Installation et démarrage](#installation-et-démarrage)
6. [Configuration](#configuration)
7. [Structure du projet](#structure-du-projet)
8. [API Reference](#api-reference)
9. [Pipeline RAG](#pipeline-rag)
10. [Démo](#démo)

---

## Vue d'ensemble

Lekki est un wiki d'entreprise intelligent qui combine gestion documentaire Markdown et pipeline RAG (Retrieval-Augmented Generation). Contrairement aux wrappers ChatGPT classiques, l'IA est **intégrée dans le workflow documentaire** : chaque réponse cite ses sources avec un lien cliquable vers le passage exact, un score de confiance quantifie la certitude, et vos documents ne quittent jamais votre infrastructure.

**Conçu pour :** équipes techniques, DSI, départements RH — tout contexte où l'information est dispersée et introuvable.

---

## Fonctionnalités

### MVP (P0 — indispensable)
| Fonctionnalité | Description |
|---|---|
| Authentification JWT | Login / register / logout, token 24h |
| Workspaces multi-équipe | Espaces isolés par département (IT, RH, Produit…) |
| Arborescence de documents | Espaces → Dossiers → Pages, vue hiérarchique |
| Éditeur Markdown | Split-view édition / prévisualisation |
| CRUD documents | Création, lecture, mise à jour, suppression |
| Chat RAG avec citations | Réponses sourcées avec liens cliquables vers le passage exact |
| Embeddings + recherche sémantique | `all-MiniLM-L6-v2`, ChromaDB, 384 dimensions |
| Déploiement Docker | `docker compose up` — fonctionne sur n'importe quelle machine |

### Différenciateurs IA (P1 — vous gagnez des points)
- **Citations sources cliquables** — chaque réponse pointe vers le document et le passage exact
- **Confidence score** — badge `● 91% de confiance` avec tooltip sur le nombre de documents sources
- **Résumé automatique** — TL;DR IA à l'ouverture d'un document
- **Tags auto-générés** — 3 à 5 tags produits à la sauvegarde
- **Documents liés** — sidebar suggérant 2-3 docs sémantiquement proches pendant l'édition
- **Recherche hybride** — BM25 full-text + similarité cosinus, fusion RRF
- **Permissions par rôle** — `viewer`, `editor`, `admin` par workspace
- **Historique de versions** — lecture seule, comparaison de révisions
- **Onboarding IA** — résumé de l'ensemble du wiki à la première connexion

### Bonus (P2 — si le temps le permet)
- Export PDF de conversation
- Badge document obsolète (> 180 jours sans modification)
- "Ask about this paragraph" — sélectionner un paragraphe, interroger l'IA en contexte
- Dark mode
- Streaming SSE des réponses IA

---

## Architecture

```
Utilisateur pose une question
        ↓
Frontend → POST /api/chats/{chat_id}/messages
        ↓
RAG Service :
  1. Embed la question (sentence-transformers/all-MiniLM-L6-v2)
  2. Recherche cosinus top-5 dans ChromaDB (par workspace)
  3. [Hybride] BM25 sur SQLite full-text top-5
  4. Fusion RRF (Reciprocal Rank Fusion)
  5. Construction du prompt avec contexte
  6. Appel LLM (OpenAI / Groq / Ollama)
  7. Parse réponse + extraction sources + calcul confidence score
        ↓
Retourne : { answer, sources: [{doc_id, title, chunk, score}], confidence }
        ↓
Frontend affiche la réponse avec les citations cliquables
```

**Ingestion (déclenchée à chaque sauvegarde de document)**

```
Document Markdown → Nettoyage → Chunking (512 tokens, overlap 64)
    → Embedding (all-MiniLM-L6-v2) → ChromaDB + SQLite
```

---

## Stack technique

### Backend
| Composant | Technologie |
|---|---|
| Framework API | FastAPI 0.111 + Uvicorn |
| Base de données | SQLite (mode WAL) + SQLAlchemy async |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` |
| Vector store | ChromaDB 0.5.3 (une collection par workspace) |
| RAG orchestration | LangChain 0.2.5 |
| BM25 full-text | rank-bm25 |
| Authentification | JWT HS256, python-jose + passlib/bcrypt |
| LLM recommandé | `gpt-4o-mini` (OpenAI) · `groq` API (fallback gratuit) · `ollama phi3:mini` (offline) |

### Frontend
| Composant | Technologie |
|---|---|
| Framework | React 18 + TypeScript (Vite) |
| Routing | React Router DOM 6 |
| State management | Zustand |
| Data fetching | TanStack Query v5 |
| Éditeur Markdown | @uiw/react-md-editor |
| HTTP client | Axios avec intercepteur JWT |
| UI components | shadcn/ui + Tailwind CSS |
| Icons | Lucide React |

### Infrastructure
- **Docker Compose** — backend + frontend + volumes persistants
- **Nginx** — reverse proxy pour le frontend en production
- **SQLite WAL** — pas de serveur DB à gérer

---

## Installation et démarrage

### Prérequis
- Docker ≥ 24 et Docker Compose ≥ 2.20
- (optionnel) Python 3.11+ et Node 20+ pour le développement local

### Démarrage rapide

```bash
# Cloner le dépôt
git clone https://github.com/votre-org/wikiai.git
cd wikiai

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env : renseigner au minimum OPENAI_API_KEY ou GROQ_API_KEY

# Lancer l'ensemble de la stack
docker compose up --build
```

L'application est disponible sur :
- **Frontend** → http://localhost:3000
- **API** → http://localhost:8000
- **Swagger UI** → http://localhost:8000/docs

> **Accès démo** : un bouton "Demo access" sur la page de connexion crée une session
> avec les données de démonstration préchargées.

### Développement local (sans Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev
```

---

## Configuration

Toutes les variables sont dans `.env` à la racine. Exemple minimal :

```env
# Sécurité
SECRET_KEY=changez-cette-valeur-en-production

# LLM — choisir l'un des trois
OPENAI_API_KEY=sk-...          # Option 1 : gpt-4o-mini (recommandé)
GROQ_API_KEY=gsk_...           # Option 2 : gratuit, très rapide
# Ollama sur localhost:11434   # Option 3 : 100% offline

# Debug
DEBUG=false
```

**Choix LLM par ordre de recommandation :**
1. **OpenAI `gpt-4o-mini`** — rapide, peu coûteux, meilleure qualité de réponse
2. **Groq API** — gratuit, latence très faible, fallback idéal
3. **Ollama `phi3:mini` ou `mistral:7b`** — zéro dépendance externe, fonctionne hors ligne

---

## Structure du projet

```
wikiai/
├── backend/
│   ├── app/
│   │   ├── main.py              # Entry point FastAPI, CORS, middleware
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database.py          # SQLite async, session factory
│   │   ├── models/              # Tables SQLAlchemy
│   │   │   ├── user.py
│   │   │   ├── workspace.py
│   │   │   ├── document.py
│   │   │   ├── permission.py
│   │   │   ├── embedding.py
│   │   │   └── chat.py
│   │   ├── schemas/             # Validation Pydantic entrées/sorties
│   │   ├── routers/             # Endpoints HTTP par domaine
│   │   │   ├── auth.py
│   │   │   ├── documents.py
│   │   │   ├── workspaces.py
│   │   │   ├── search.py
│   │   │   ├── chat.py
│   │   │   └── permissions.py
│   │   └── services/            # Logique métier isolée
│   │       ├── rag_service.py   # Orchestrateur RAG complet
│   │       ├── embedding_service.py
│   │       ├── llm_service.py
│   │       ├── document_service.py
│   │       └── auth_service.py
│   ├── data/
│   │   ├── wiki.db              # SQLite (gitignored)
│   │   ├── chroma/              # ChromaDB persistant (gitignored)
│   │   └── uploads/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, Header, Layout
│   │   │   ├── editor/          # MarkdownEditor, DocumentSummary, RelatedDocs
│   │   │   ├── chat/            # ChatPanel, MessageBubble, SourceCitation
│   │   │   └── search/          # SearchBar, SearchResults
│   │   ├── pages/               # LoginPage, DashboardPage, DocumentPage, SearchPage
│   │   ├── hooks/               # useAuth, useDocuments, useRAG
│   │   ├── stores/              # Zustand — authStore, documentStore
│   │   └── api/client.ts        # Axios + intercepteur JWT
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Reference

### Authentification
```
POST   /api/auth/register     { email, username, password }
POST   /api/auth/login        { email, password } → { access_token, user }
GET    /api/auth/me           → { id, email, username, role, workspaces }
```

### Workspaces
```
GET    /api/workspaces
POST   /api/workspaces        { name, description, icon }
GET    /api/workspaces/{id}   → { workspace, documents_tree }
DELETE /api/workspaces/{id}
```

### Documents
```
GET    /api/workspaces/{id}/documents   ?tree=true
POST   /api/workspaces/{id}/documents  { title, content, parent_id?, status }
GET    /api/documents/{id}             → { ..., tags, ai_summary, related_docs[] }
PUT    /api/documents/{id}
DELETE /api/documents/{id}
GET    /api/documents/{id}/versions
POST   /api/documents/{id}/summarize   → { summary }
POST   /api/documents/{id}/embed       → { chunks_created }
```

### Recherche
```
GET    /api/search   ?q=<query>&workspace_id=<id>&mode=hybrid|semantic|fulltext
```

### Chat RAG
```
POST   /api/workspaces/{id}/chats
POST   /api/chats/{id}/messages   { question, doc_context_id? }
       → { answer, sources: [{doc_id, title, chunk_text, similarity_score}], confidence }
POST   /api/chats/{id}/messages/stream   (SSE — bonus)
```

La documentation interactive complète est disponible sur `/docs` (Swagger UI).

---

## Pipeline RAG

### Paramètres de chunking
```python
RecursiveCharacterTextSplitter(
    chunk_size=512,       # bon équilibre précision / contexte
    chunk_overlap=64,     # évite de couper les idées à cheval sur deux chunks
    separators=["\n## ", "\n### ", "\n\n", "\n", " "]
)
```

### Modèle d'embedding
```
sentence-transformers/all-MiniLM-L6-v2
~80 MB · 384 dimensions · init ~5s · inférence <10ms/requête
```

### Calcul du confidence score
```python
confidence = 0.7 * top_similarity + 0.3 * avg_similarity
# Résultat en %, plafonné à 99%
```

### Prompt système
Le LLM est contraint à répondre **uniquement** à partir des documents fournis en contexte. Si la réponse est absente des sources, il l'indique explicitement. Chaque réponse cite les documents sources au format `[Source: Titre du document]`.

---

## Démo

### Dataset de démonstration
10 documents réalistes sont préchargés via le bouton "Demo access" :
Architecture système microservices · Guide JWT · Politique sécurité API · Onboarding RH · Guide Docker · Procédure incident P1 · Roadmap Q3 · Charte Git · Guide RGPD *(badge obsolète)* · FAQ Technique

### Questions de démo recommandées
- *"Quelle est la procédure en cas d'incident P1 ?"*
- *"Comment configurer l'authentification JWT ?"*
- *"Quelles sont nos obligations RGPD sur les données personnelles ?"*
- *"Résume notre architecture de déploiement."*

> **Règle d'or :** ne jamais improviser les questions IA en démo. Testez chaque question à l'avance et vérifiez la qualité des réponses.

---

## Comparaison

| Critère | WikiAI | Notion | Confluence | Guru |
|---|:---:|:---:|:---:|:---:|
| Markdown natif | ✅ | ✅ | ⚠️ | ✅ |
| RAG intégré | ✅ | ⚠️ Addon | ❌ | ✅ |
| Citations sources | ✅ | ❌ | ❌ | ⚠️ |
| Confidence score | ✅ | ❌ | ❌ | ❌ |
| Open source | ✅ | ❌ | ❌ | ❌ |
| Self-hosted | ✅ | ❌ | ⚠️ | ❌ |
| Données 100% internes | ✅ | ⚠️ Cloud | ⚠️ Cloud | ❌ |

---

*Construit en 8 heures. Voici ce que ça donne en 8 semaines.*
