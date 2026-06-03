# Lekki Backend — Tests et validation

Guide complet pour exécuter les tests **avec ou sans** clés API, et valider les nouvelles fonctionnalités (bascule LLM, RAG Gemini, FTS5).

---

## Table des matières

1. [Prérequis](#prérequis)
2. [Configuration `.env`](#configuration-env)
3. [Types de tests](#types-de-tests)
4. [Tests automatisés (pytest)](#tests-automatisés-pytest)
5. [Tests d'intégration API (`test_api.py`)](#tests-dintégration-api-test_apipy)
6. [Tests de bascule LLM (`test_llm_failover.py`)](#tests-de-bascule-llm-test_llm_failoverpy)
7. [Tests manuels HTTP](#tests-manuels-http)
8. [Résultats de la dernière exécution](#résultats-de-la-dernière-exécution)
9. [Dépannage](#dépannage)

---

## Prérequis

```powershell
cd backend
..\.venv\Scripts\activate          # venv à la racine Lekki/
pip install -r requirements.txt    # si besoin
cp .env.example .env               # puis renseigner les clés
```

| Outil | Usage |
|-------|--------|
| **pytest** | Tests unitaires et routes (SQLite mémoire, mocks) |
| **scripts/test_api.py** | Smoke test contre serveur live (`:8000`) |
| **scripts/test_llm_failover.py** | Bascule LLM simulée (sans réseau) |
| **uvicorn** | Serveur requis pour `test_api.py` et tests HTTP manuels |

---

## Configuration `.env`

```env
# Génération /ask — ordre de bascule
LLM_PROVIDER_ORDER=gemini,groq,cerebras
LLM_PROVIDER_COOLDOWN_MINUTES=60

GEMINI_API_KEY=votre-cle
GROQ_API_KEY=votre-cle
CEREBRAS_API_KEY=votre-cle

# Embeddings (indexation) — Gemini pour l'instant
EMBEDDING_PROVIDER_ORDER=gemini
GEMINI_EMBEDDING_MODEL=models/gemini-embedding-001
```

| Clé | Obligatoire pour | Sans clé |
|-----|------------------|----------|
| `GEMINI_API_KEY` | Embeddings + 1er essai `/ask` | Embed échoue ; bascule si autres clés |
| `GROQ_API_KEY` | 2e essai `/ask` | Ignoré dans la chaîne |
| `CEREBRAS_API_KEY` | 3e essai `/ask` | Ignoré dans la chaîne |

Vérifier les clés chargées (sans afficher les valeurs) :

```powershell
python -c "from app.config import settings; print('gemini:', bool(settings.GEMINI_API_KEY)); print('groq:', bool(settings.GROQ_API_KEY)); print('cerebras:', bool(settings.CEREBRAS_API_KEY))"
```

---

## Types de tests

| Fichier / commande | Réseau | Clés API | Serveur `:8000` |
|--------------------|--------|----------|-----------------|
| `pytest tests/` | Non* | Non* | Non |
| `pytest tests/test_llm_failover.py` | Non | Non | Non |
| `python scripts/test_llm_failover.py` | Non | Non | Non |
| `python scripts/test_api.py` | Oui | Gemini (embed) | **Oui** |
| `curl` / `api_tests.http` | Oui | Selon endpoint | **Oui** |

\*Sauf tests que vous ajoutez explicitement contre des APIs réelles.

---

## Tests automatisés (pytest)

**Toujours depuis `backend/`** (voir `pytest.ini` → `pythonpath = .`).

### Tout lancer

```powershell
cd backend
pytest tests/ -v
```

### Par module

```powershell
pytest tests/test_models.py -v      # Modèles SQLAlchemy
pytest tests/test_routes.py -v      # Auth + pages (JWT, rôles)
pytest tests/test_llm_failover.py -v  # Bascule LLM (mocks)
pytest tests/test_auth.py -v        # Auth (si présent)
```

### Ce qui est couvert

| Fichier | Contenu |
|---------|---------|
| `test_models.py` | User, Page, Chunk, Chat, Message, mots de passe |
| `test_routes.py` | Login, `/auth/me`, CRUD pages, permissions |
| `test_llm_failover.py` | Router Gemini→Groq→Cerebras, `/ask` mocké, `503`, `/llm/status` |

**Attendu :** `47 passed` (ou plus si de nouveaux tests sont ajoutés).

---

## Tests d'intégration API (`test_api.py`)

Valide le parcours **réel** : login → CRUD page → **embedding Gemini** → FTS5 → suppression.

### 1. Démarrer le serveur (terminal 1)

```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```

> Après modification du code (bascule LLM, nouvelles routes), **redémarrer** uvicorn pour charger les changements.

### 2. Seed (une fois)

```powershell
python -m scripts.seed
```

Compte : `admin@lekki.local` / `lekki123` (ou `SEED_PASSWORD`).

### 3. Lancer le test (terminal 2)

```powershell
python scripts/test_api.py
```

**Succès attendu :**

```
Login status: 200
Page créée : <uuid>
Résultat embedding: {'status': 'success', ..., 'chunks_created': >= 1}
Résultats recherche: >= 1 page(s)
Tous les tests ont réussi.
```

Variables optionnelles : `LEKKI_API_URL`, `SEED_PASSWORD`, `INTERNAL_API_KEY`.

---

## Tests de bascule LLM (`test_llm_failover.py`)

Simule Gemini / Groq / Cerebras **sans appel HTTP** — utile en attendant les clés ou hors quota.

```powershell
python scripts/test_llm_failover.py
```

Scénarios affichés :

1. Premier fournisseur disponible (Gemini simulé)
2. Quota Gemini → bascule Groq
3. Quota Gemini + Groq → Cerebras
4. Gemini sans clé → Groq
5. Tous en quota → `AllProvidersFailedError`
6. Statut réel des fournisseurs selon votre `.env`

Équivalent pytest :

```powershell
pytest tests/test_llm_failover.py -v
```

---

## Tests manuels HTTP

### Santé et statut LLM

```powershell
curl.exe http://127.0.0.1:8000/health
curl.exe http://127.0.0.1:8000/api/v1/llm/status
```

Exemple `llm/status` :

```json
{
  "providers": [
    {"name": "gemini", "configured": true, "in_cooldown": false},
    {"name": "groq", "configured": true, "in_cooldown": false},
    {"name": "cerebras", "configured": false, "in_cooldown": false}
  ]
}
```

### Question RAG (`POST /ask`)

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/v1/ask" ^
  -H "Content-Type: application/json" ^
  -d "{\"question\": \"Comment deployer avec Docker ?\"}"
```

**Succès (200) :**

```json
{
  "answer": "...",
  "sources": ["<page_id>", "..."],
  "provider": "gemini"
}
```

**Tous fournisseurs indisponibles (503) :**

```json
{
  "detail": {
    "message": "Tous les fournisseurs LLM sont indisponibles (quota ou erreur).",
    "errors": [["gemini", "429 ..."], ["groq", "..."], ...]
  }
}
```

### REST Client (VS Code)

Ouvrir `api_tests.http` : login → pages → embed → `/ask` → `llm/status`.

---

## Résultats de la dernière exécution

| Suite | Résultat | Détail |
|-------|----------|--------|
| `pytest tests/` | **47 passed** | ~36 s, sans API externe |
| `scripts/test_llm_failover.py` | **OK** | 6 scénarios simulés |
| `scripts/test_api.py` | **OK** | Login, CRUD, embed Gemini, FTS5 |
| `POST /ask` (Gemini seul) | **503** | Quota génération Gemini épuisé ; Groq/Cerebras non configurés dans `.env` |
| `GET /llm/status` | **200** | `gemini` configuré ; bascule inactive sans clés Groq/Cerebras |

**Conclusion :** le backend et la bascule fonctionnent. Pour un `/ask` en **200**, il faut soit un quota Gemini disponible, soit renseigner **`GROQ_API_KEY`** et/ou **`CEREBRAS_API_KEY`** dans `.env`.

---

## Dépannage

### `ModuleNotFoundError: No module named 'app'`

Lancer pytest depuis **`backend/`**, ou vérifier que `pytest.ini` contient `pythonpath = .`.

### `test_api.py` — connexion refusée

Démarrer `uvicorn` sur le port 8000.

### Embedding OK mais `/ask` en 500 ou 503

| Code | Cause |
|------|--------|
| **500** | Ancienne version du serveur (redémarrer uvicorn) |
| **503** | Quota / erreur sur tous les fournisseurs configurés — ajouter clés Groq/Cerebras ou attendre fin de cooldown (`in_cooldown: true` dans `/llm/status`) |

### `llm/status` → 404

Serveur non redémarré après ajout de la route. Relancer uvicorn.

### Tests pytest lents sur `test_create_page`

La création de page tente un embed Gemini en arrière-plan ; en CI, mocker `rag_service.embed_page` si nécessaire.

---

## Références

- [README.md](./README.md) — Architecture, bascule LLM, configuration
- [API.md](./API.md) — Contrats HTTP (`/ask`, `/llm/status`)
- [.env.example](./.env.example) — Variables d'environnement
