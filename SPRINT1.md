# Sprint 1 — Crédibilité produit

> **Objectif :** passer d’un prototype *lecture + chat* à un **wiki utilisable au quotidien**, déployable en une commande et présentable en démo.

**Definition of Done :** un utilisateur `editor` se connecte, crée ou modifie une page Markdown, pose une question RAG avec sources cliquables, retrouve ses conversations — le tout via `docker compose up`.

**État au 2026-06-03 :** le backend couvre déjà Pages, Chats, `/ask` et l’auth. Le gros du sprint reste **frontend + sécurité + Docker + doc**.

---

## Table des matières

1. [Déjà livré (ne pas refaire)](#1-déjà-livré-ne-pas-refaire)
2. [Backend — reste à faire](#2-backend--reste-à-faire)
3. [Frontend — reste à faire](#3-frontend--reste-à-faire)
4. [Infrastructure — reste à faire](#4-infrastructure--reste-à-faire)
5. [Documentation — reste à faire](#5-documentation--reste-à-faire)
6. [Parcours de validation](#6-parcours-de-validation)
7. [Priorisation si le temps manque](#7-priorisation-si-le-temps-manque)
8. [Hors scope Sprint 1](#8-hors-scope-sprint-1)

---

## 1. Déjà livré (ne pas refaire)

| Domaine | Détail | Fichiers / routes |
|---------|--------|-------------------|
| Auth | Login JWT, `/auth/me`, rôles `admin` / `editor` / `reader` | `backend/app/routers/auth.py` |
| Pages API | CRUD, FTS5, embed RAG auto à la création/modification | `backend/app/routers/pages.py` |
| Chats API | Liste, création, détail, suppression, messages | `backend/app/routers/chats.py` |
| RAG | `POST /ask` — sources enrichies, `confidence`, persistance | `backend/app/routers/rag.py` |
| Failover LLM | Gemini → Groq → Cerebras | `backend/app/services/llm_providers/` |
| Tests backend | auth, pages, chats, ask, failover | `backend/tests/` |
| Front branché | Login, liste pages, recherche FTS, chat basique | `Frontend/src/crochets/useApi.js` |

---

## 2. Backend — reste à faire

### 2.1 Sécurité (priorité haute)

| # | Tâche | Indications | Fichiers |
|---|-------|-------------|----------|
| B1 | **Retirer le bypass `Bearer dev`** | Activer uniquement si `DEBUG=true` ; en prod (`DEBUG=false`), rejeter le token `dev` | `backend/app/services/auth_service.py` (`_resolve_user_from_token`) |
| B2 | **JWT obligatoire sur `POST /ask`** | Remplacer `get_optional_user` par `get_current_user` ; supprimer le mode anonyme | `backend/app/routers/rag.py` |
| B3 | **Masquer les erreurs 500 en prod** | Si `DEBUG=false` : réponse `{ "detail": "Une erreur interne est survenue." }` sans `type` ni `message` | `backend/app/main.py` (`global_exception_handler`) |
| B4 | **Nettoyer `.env.example`** | Remplacer les clés Groq/Cerebras par des placeholders vides ; ne jamais committer de vraies clés | `backend/.env.example` |
| B5 | **CORS configurable** | Variable `CORS_ORIGINS` (liste séparée par virgules) pour Docker / prod | `backend/app/config.py`, `backend/app/main.py` |

**Tests à mettre à jour après B2 :**

```powershell
cd backend
pytest tests/test_ask.py tests/test_llm_failover.py -v
```

- Ajouter : `401` sur `/ask` sans token.
- Adapter les tests existants : header `Authorization: Bearer {token}` sur tous les appels `/ask`.

---

### 2.2 Intégration éditeur (routes pages)

| # | Tâche | Indications | Fichiers |
|---|-------|-------------|----------|
| B6 | **Routes `/pages` sans slash final** | Comme `/chats` : utiliser `@router.get("")` et `@router.post("")` au lieu de `"/"` pour éviter les redirections 307 (POST perd le corps) | `backend/app/routers/pages.py` |

Le front appelle déjà `/pages?…` et fera `POST /pages` — aligner le backend avant de brancher l’éditeur.

---

### 2.3 Sources cliquables (enrichissement API)

| # | Tâche | Indications | Fichiers |
|---|-------|-------------|----------|
| B7 | **Ajouter `title` dans `sources[]`** *(optionnel, recommandé)* | Lors de `build_sources()`, joindre le titre de la page (`Page.title`) pour l’affichage sans fetch supplémentaire | `backend/app/services/rag_service.py` |

Format cible :

```json
{
  "page_id": "uuid",
  "title": "Guide Docker",
  "excerpt": "Pour déployer…",
  "score": 0.87
}
```

`GET /pages/{id}` existe déjà pour la navigation complète.

---

### 2.4 Inscription (optionnel Sprint 1)

| # | Tâche | Indications | Fichiers |
|---|-------|-------------|----------|
| B8 | **`POST /auth/register`** | Corps `{ email, username, password }` → création user rôle `reader` + JWT ; non bloquant si seed suffit | `backend/app/routers/auth.py`, schéma Pydantic, `backend/API.md` |

Comptes seed actuels (`scripts/seed.py`) :

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `admin@lekki.local` | `lekki123` (ou `SEED_PASSWORD`) | admin |
| `editor@lekki.local` | idem | editor |
| `reader@lekki.local` | idem | reader |

---

## 3. Frontend — reste à faire

### 3.1 Éditeur wiki (priorité #1)

| # | Tâche | Indications | Fichiers |
|---|-------|-------------|----------|
| F1 | **Créer une page** | Bouton « Nouvelle page » → modal ou panneau : titre, contenu Markdown, catégorie → `POST /pages` | `useApi.js`, nouveau composant éditeur, `TableauDeBordWiki.jsx` |
| F2 | **Modifier une page** | Split-view Markdown / preview → `PUT /pages/{id}` | idem |
| F3 | **Supprimer une page** | Bouton visible uniquement pour `admin` → `DELETE /pages/{id}` + confirmation | idem |
| F4 | **Permissions UI** | `reader` : lecture seule ; `editor` : créer/éditer ; `admin` : tout + suppression | Vérifier `utilisateur.role` |
| F5 | **Feedback indexation** | Toast ou badge « Indexé pour l’IA » après save (le backend embed automatiquement) | UI après réponse 200/201 |

**Endpoints à ajouter dans `useApi.js` :**

```javascript
creerPage({ title, content, category })   // POST /pages
modifierPage(id, payload)               // PUT /pages/{id}
supprimerPage(id)                       // DELETE /pages/{id}
```

**Dépendances suggérées :** `react-markdown` ou équivalent pour la preview (vérifier `Frontend/package.json`).

---

### 3.2 Sources RAG cliquables

| # | Tâche | Indications | Fichiers |
|---|-------|-------------|----------|
| F6 | **Clic source → page** | Utiliser `source.page_id` → `recupererPage(id)` + `setPageSelectionnee` | `InterfaceClavardage.jsx`, `TableauDeBordWiki.jsx` (remonter callback) |
| F7 | **Surlignage extrait** | Rechercher `excerpt` dans le contenu Markdown et scroller / surligner | `TableauDeBordWiki.jsx` |
| F8 | **Historique rechargé** | Même comportement sur messages venant de `GET /chats/{id}/messages` (`sources` en JSON string) | `affichage.js` (`normaliserMessage` conserve déjà le parsing) |

---

### 3.3 UI conversations complète

| # | Tâche | Indications | Fichiers |
|---|-------|-------------|----------|
| F9 | **Liste des conversations** | Panneau latéral ou dropdown : titres + dates depuis `GET /chats` | `InterfaceClavardage.jsx`, `useApi.js` |
| F10 | **Changer de conversation** | Clic → `GET /chats/{id}/messages?limit=50` + mise à jour `chatId` | `useApi.js`, `TableauDeBordWiki.jsx` |
| F11 | **Nouvelle conversation** | Bouton explicite → `POST /chats` avec titre | idem |
| F12 | **Supprimer une conversation** | `DELETE /chats/{id}` + confirmation | `useApi.js` |
| F13 | **Retirer bannière obsolète** | Supprimer ou reformuler le message « routes /chats et /ask non exposées » | `InterfaceClavardage.jsx` (~l. 135) |

Aujourd’hui `recupererHistoriqueChat()` ne prend que `chats[0]` — à remplacer par une vraie sélection.

---

### 3.4 Cohérence démo & UX

| # | Tâche | Indications | Fichiers |
|---|-------|-------------|----------|
| F14 | **Aligner le compte démo** | Remplacer `admin@lekki.io` / `Admin1234!` par `admin@lekki.local` / `lekki123` | `Frontend/src/vues/PageConnexion.jsx` |
| F15 | **Gestion erreurs API pages** | Afficher les `403` / `422` de l’éditeur via `erreurApi` | `useApi.js`, composants |

---

## 4. Infrastructure — reste à faire

| # | Tâche | Indications | Fichiers à créer |
|---|-------|-------------|------------------|
| I1 | **`backend/Dockerfile`** | Python 3.12-slim, `pip install -r requirements.txt`, `CMD uvicorn app.main:app --host 0.0.0.0 --port 8000` | `backend/Dockerfile` |
| I2 | **`Frontend/Dockerfile`** | Build Vite + nginx (ou serve statique) ; `VITE_API_URL` au build | `Frontend/Dockerfile` |
| I3 | **`docker-compose.yml`** (racine) | Services `backend`, `frontend` ; volume `./backend/data` pour SQLite | `docker-compose.yml` |
| I4 | **Variables d’environnement** | Passer `SECRET_KEY`, `GEMINI_API_KEY`, `CORS_ORIGINS` via compose | `.env` (gitignored), documenter dans `.env.example` |
| I5 | **Seed au démarrage** | Option : `docker compose run backend python scripts/seed.py` documentée | `docker-compose.yml`, ce README |
| I6 | **Healthcheck** | `curl -f http://localhost:8000/health` sur le service backend | `docker-compose.yml` |

**Commande cible :**

```bash
docker compose up --build
# → Frontend http://localhost:5173 (ou 80)
# → API      http://localhost:8000/api/v1
```

---

## 5. Documentation — reste à faire

| # | Tâche | Indications | Fichiers |
|---|-------|-------------|----------|
| D1 | **Feuille de route backend** | Marquer chats ✓, ask ✓, confidence ✓ ; retirer « routes à faire » | `backend/README.md` (~l. 578) |
| D2 | **README racine** | Distinguer clairement *vision P1/P2* vs *MVP livré Sprint 1* | `README.md` |
| D3 | **API.md** | JWT sur `/ask`, retrait `Bearer dev`, statut register si implémenté | `backend/API.md` |
| D4 | **TESTING.md** | Ajouter parcours Docker + checklist Sprint 1 | `backend/TESTING.md` |
| D5 | **api_tests.http** | Flux complet : login → create chat → create page → ask | `backend/api_tests.http` |

---

## 6. Parcours de validation

Exécuter manuellement avant de clôturer le sprint :

```
1. docker compose up
2. Login admin@lekki.local / lekki123
3. Créer une page Markdown (catégorie technique)
4. Poser une question RAG liée au contenu
5. Cliquer une source → la page s’ouvre
6. Créer une 2e conversation, y envoyer un message
7. Revenir à la 1re conversation via la liste
8. Supprimer une conversation (optionnel)
9. Déconnexion / reconnexion → historique conservé
10. pytest backend/tests/ — 0 échec
```

**Tests automatisés :**

```powershell
cd backend
pytest tests/ -v
```

---

## 7. Priorisation si le temps manque

### Must have (bloquant démo)

- [ ] F1–F4 — Éditeur CRUD pages
- [ ] F6 — Sources cliquables (navigation page minimum)
- [ ] F14 — Compte démo aligné
- [ ] B6 — Routes `/pages` sans slash
- [ ] B1, B2 — Sécurité minimale (dev bypass + JWT `/ask`)

### Should have

- [ ] F9–F11 — UI multi-conversations
- [ ] I1–I4 — Docker compose fonctionnel
- [ ] B3, B4 — Erreurs 500 + `.env.example` propres

### Nice to have

- [ ] F7 — Surlignage extrait
- [ ] F12 — Suppression chat
- [ ] B7 — `title` dans sources
- [ ] B8 — Register
- [ ] D1–D5 — Doc complète

---

## 8. Hors scope Sprint 1

Ne pas entamer dans ce sprint (Sprint 2+) :

- Recherche hybride BM25 + sémantique (RRF)
- Workspaces multi-équipes
- Streaming SSE des réponses IA
- Résumé auto, tags IA, documents liés
- Embeddings locaux / ChromaDB
- Admin `GET/PUT/DELETE /users`
- Historique de versions des pages
- Dark mode, export PDF

---

## Estimation globale

| Zone | Effort estimé |
|------|---------------|
| Backend (B1–B7) | 2–3 jours |
| Frontend (F1–F15) | 4–6 jours |
| Infra Docker (I1–I6) | 1–2 jours |
| Documentation (D1–D5) | 0,5–1 jour |
| **Total Sprint 1** | **~8–12 jours** (1 dev full-stack) |

---

## Références

- Contrats HTTP : [`backend/API.md`](backend/API.md)
- Architecture backend : [`backend/README.md`](backend/README.md)
- Tests : [`backend/TESTING.md`](backend/TESTING.md)
- Vision produit long terme : [`README.md`](README.md)
