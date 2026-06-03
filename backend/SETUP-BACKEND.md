# Backend Lekki Wiki — Guide pas à pas

Compléter le MVP backend en **6 étapes**. Temps estimé : 15–30 min.

---

## Étape 0 — Prérequis

- Python 3.11+ installé
- Terminal ouvert dans le dossier **`backend/`**
- Environnement virtuel à la racine du repo : `Lekki/venv/`

```powershell
cd "C:\Users\HP PROBOOK 450 G2\Lekki"
.\venv\Scripts\Activate.ps1
cd backend
pip install -r requirements.txt
```

---

## Étape 1 — Configuration `.env`

```powershell
copy .env.example .env
```

Éditez `.env` et renseignez au minimum :

```env
GEMINI_API_KEY=votre_cle_ici
```

Clé gratuite : [Google AI Studio](https://aistudio.google.com/apikey)

Optionnel (failover si quota Gemini) : `GROQ_API_KEY`, `CEREBRAS_API_KEY`.

---

## Étape 2 — Base de données + seed

Si vous avez déjà une ancienne base de test, supprimez-la pour repartir propre :

```powershell
Remove-Item -Force data\wiki.db -ErrorAction SilentlyContinue
```

Puis :

```powershell
python -m scripts.seed
```

Résultat attendu :

- 3 utilisateurs : `admin@lekki.local`, `editor@lekki.local`, `reader@lekki.local`
- Mot de passe : `lekki123` (ou `SEED_PASSWORD` dans `.env`)
- 7 pages wiki (dont **5 use cases PME**)

---

## Étape 3 — Indexation RAG (embeddings)

**Obligatoire** pour que `/ask` réponde correctement.

```powershell
python -m scripts.index_rag
```

Chaque page doit afficher `OK … → N chunks`.  
En cas d’erreur `GEMINI_API_KEY manquante`, retournez à l’étape 1.

Réindexer une seule page :

```powershell
python -m scripts.index_rag --page-id b0000000-0000-4000-8000-000000000001
```

---

## Étape 4 — Lancer l’API

```powershell
uvicorn app.main:app --reload --port 8000
```

Vérifications rapides :

- [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) → `{"status":"ok"}`
- [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) → Swagger

---

## Étape 5 — Tests manuels (5 use cases PME)

### 5.1 Login

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/v1/auth/login" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "username=admin@lekki.local&password=lekki123"
```

Copiez `access_token` dans une variable ou utilisez Swagger **Authorize**.

### 5.2 Recherche FTS

```powershell
curl.exe "http://127.0.0.1:8000/api/v1/pages/search?q=congé" `
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### 5.3 Chatbot RAG (`/ask`)

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/v1/ask" `
  -H "Content-Type: application/json" `
  -d "{\"question\": \"Combien de jours de congés payés par an ?\"}"
```

Questions de validation :

| Question | Thème attendu |
|----------|----------------|
| Combien de jours de congés payés par an ? | Politique de congés |
| Que faire le premier jour d'onboarding ? | Onboarding |
| Quel est le plafond repas client ? | Remboursement frais |
| Quelle est la longueur minimale d'un mot de passe ? | Charte IT |
| Combien de jours de télétravail par semaine ? | Guide télétravail |

Réponse OK : `answer` + `sources` (IDs de pages) + `provider` (`gemini`, etc.).

### 5.4 Script d’intégration (optionnel)

Avec le serveur lancé, dans un **autre** terminal :

```powershell
python scripts/test_api.py
```

---

## Étape 6 — Tests automatisés

```powershell
python -m pytest -q
```

Attendu : **47 passed** (ou plus).

---

## Dépannage

| Problème | Solution |
|----------|----------|
| `Seed déjà appliqué` | Normal si `wiki.db` existe. Lancez `index_rag` ou supprimez `data/wiki.db` puis re-seed. |
| `/ask` : « aucune information » | `python -m scripts.index_rag` |
| `/ask` : 503 embedding | Vérifier `GEMINI_API_KEY` dans `.env`, redémarrer uvicorn |
| FTS : 0 résultat | Re-seed ou créer une page via API (index FTS auto) |
| Login 401 | Email `admin@lekki.local` + mot de passe `lekki123` |
| Bypass dev rapide | Header `Authorization: Bearer dev` (admin uniquement) |

---

## Ce qui reste hors scope MVP (OK pour plus tard)

- `POST /auth/register`
- Routes `/chats/*`
- JWT obligatoire sur `/ask`
- Admin `/users/*`

---

## Récap commandes (copier-coller)

```powershell
cd backend
copy .env.example .env
# → éditer GEMINI_API_KEY
python -m scripts.seed
python -m scripts.index_rag
uvicorn app.main:app --reload --port 8000
python -m pytest -q
```
