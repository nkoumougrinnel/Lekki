# Lekki Wiki — Backend

API REST **FastAPI** pour le wiki d’entreprise Lekki : pages Markdown, RAG, chats et gestion des utilisateurs. Ce dossier contient le serveur Python, la base SQLite, les migrations Alembic et les données de démo.

---

## Stack

| Composant | Technologie |
|-----------|-------------|
| Framework | FastAPI + Uvicorn |
| ORM | SQLAlchemy 2 (async) |
| Base | SQLite (`data/wiki.db`) |
| Migrations | Alembic |
| Validation API | Pydantic v2 |
| Auth (prévu) | JWT (`python-jose`, `passlib` / bcrypt) |

---

## Structure du projet

```
backend/
├── app/
│   ├── main.py              # Point d’entrée FastAPI, CORS, lifespan
│   ├── database.py          # Engine async, session, migrations au démarrage
│   ├── models/              # Tables SQLAlchemy (diagramme MVP)
│   │   ├── user.py          # User
│   │   ├── page.py          # Page (+ relation chunks)
│   │   ├── chunk.py         # Chunk (RAG)
│   │   ├── chat.py          # Chat, Message
│   │   └── lekki_class_diagram.html
│   ├── schemas/             # Contrats Pydantic (entrées / sorties HTTP)
│   │   └── page.py
│   ├── routers/             # Routes HTTP
│   │   └── pages.py         # CRUD /api/v1/pages
│   ├── service/             # Logique métier (auth, RAG — à venir)
│   └── middelware/          # JWT middleware (à venir)
├── alembic/                 # Migrations versionnées
│   ├── env.py
│   └── versions/
│       └── 001_initial_mvp_schema.py
├── scripts/
│   └── seed.py              # Données de démo (users + pages)
├── data/                    # SQLite (gitignored)
│   └── wiki.db
├── API.md                   # Référence complète des endpoints MVP
├── alembic.ini
├── .env.example
└── requirements.txt
```

---

## Modèle de données (MVP)

Aligné sur le diagramme de classes dans `app/models/lekki_class_diagram.html` :

| Modèle | Rôle |
|--------|------|
| **User** | Comptes (`admin`, `editor`, `reader`) |
| **Page** | Articles wiki (`category`, `status`, `is_embedded`, `view_count`) |
| **Chunk** | Morceaux de texte pour le RAG, liés à une page |
| **Chat** / **Message** | Historique du chatbot (sources JSON vers les pages) |

Relations principales : `User` → `Page` (créateur), `Page` → `Chunk`, `User` → `Chat` → `Message`.

Les anciens modèles *Workspace / Document / Permission / Embedding* ont été retirés au profit de ce schéma simplifié.

---

## Schémas Pydantic (`app/schemas/`)

Les **schémas** ne sont pas stockés en base : ils définissent le **contrat HTTP**.

- **Entrée** : valider le JSON reçu (`PageCreate`, `PageUpdate`).
- **Sortie** : formater la réponse (`PageResponse`) sans exposer `password_hash`, etc.
- **Swagger** : documentation auto sur `/docs`.

Les **modèles** SQLAlchemy (`app/models/`) décrivent les **tables** ; les deux couches restent séparées volontairement.

---

## Installation

Depuis la racine du monorepo (venv recommandé à la racine `Lekki/`) :

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Variables utiles (voir `.env.example`) :

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Clé JWT (à changer en prod) |
| `SEED_PASSWORD` | Mot de passe des comptes de démo (défaut : `lekki123`) |
| `DATABASE_URL` | Optionnel — défaut : `sqlite+aiosqlite:///<backend>/data/wiki.db` |

---

## Base de données

### Migrations

Au démarrage de l’API, `init_db()` exécute `alembic upgrade head`.

En manuel (depuis `backend/`) :

```bash
alembic upgrade head
```

Révision initiale : `001` — tables `users`, `pages`, `chunks`, `chats`, `messages`.

> Si la base a été créée avant Alembic (`create_all`), le code **stamp** automatiquement `head` pour éviter l’erreur `table users already exists`.

### Seed (données de démo)

```bash
python -m scripts.seed
```

Crée (une seule fois, idempotent) :

| Compte | Email | Rôle | ID fixe |
|--------|-------|------|---------|
| admin | admin@lekki.local | admin | `a0000000-0000-4000-8000-000000000001` |
| editor | editor@lekki.local | editor | `a0000000-0000-4000-8000-000000000002` |
| reader | reader@lekki.local | reader | `a0000000-0000-4000-8000-000000000003` |

+ 3 pages exemple (`rh`, `technique`, `guides`) et 1 chunk sur la page technique.

---

## Lancer le serveur

**Toujours depuis le dossier `backend/`** (chemins SQLite relatifs) :

```bash
uvicorn app.main:app --reload --port 8000
```

| URL | Contenu |
|-----|---------|
| http://127.0.0.1:8000/ | Message d’accueil |
| http://127.0.0.1:8000/health | Santé |
| http://127.0.0.1:8000/docs | Swagger UI |
| http://127.0.0.1:8000/api/v1/pages | Liste des pages |

Si le navigateur affiche *« connexion refusée »* : le serveur n’est pas démarré ou a **planté au startup** (souvent une erreur de migration). Vérifier le terminal après `uvicorn`.

---

## API implémentée aujourd’hui

Préfixe global : `/api/v1`

| Module | Statut |
|--------|--------|
| **Pages** | CRUD complet (`GET`, `POST`, `PUT`, `DELETE`) |
| Auth, Search, Ask, Chats, Users, Internal embed | Documentés dans `API.md`, **à implémenter** |

Exemple — créer une page (JWT pas encore branché ; `creator_id` en query) :

```http
POST /api/v1/pages?creator_id=a0000000-0000-4000-8000-000000000002
Content-Type: application/json

{
  "title": "Ma page",
  "content": "## Contenu",
  "category": "technique"
}
```

Référence détaillée : **[API.md](./API.md)**.

---

## Dépannage

### `table users already exists`

La base existait sans table `alembic_version`. Relancer le serveur après mise à jour de `database.py` (stamp auto), ou :

```bash
alembic stamp head
```

### Repartir de zéro

```bash
# Depuis backend/
del data\wiki.db
alembic upgrade head
python -m scripts.seed
```

### Port 8000 occupé

```bash
uvicorn app.main:app --reload --port 8001
```

---

## Prochaines étapes

- [ ] `AuthService` + routes `/auth/register`, `/auth/login`, `/auth/me`
- [ ] Middleware JWT et rôles sur les routes pages
- [ ] `creator_id` issu du token (supprimer le query param)
- [ ] Recherche, RAG (`/ask`), chats, users admin
- [ ] Couche `app/crud/` ou repositories
- [ ] Pagination `?page=` alignée sur `API.md`

---

## Fichiers utiles

- [API.md](./API.md) — Spécification endpoints MVP
- [app/models/lekki_class_diagram.html](./app/models/lekki_class_diagram.html) — Diagramme de classes (ouvrir dans un navigateur)
