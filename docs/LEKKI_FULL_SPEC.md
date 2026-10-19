# 📘 Spécifications Exhaustives de Lekki

## 1. Vision et Proposition de Valeur

Lekki est une base de connaissances intégrant un pipeline **RAG (Retrieval-Augmented Generation)**. 
**Philosophie centrale :** *"Notre RAG ne devine pas — il cite."* 
L'objectif est de transformer des documents statiques en une intelligence interactive capable de répondre à des questions en sourçant précisément ses réponses dans la documentation interne, tout en garantissant la souveraineté des données (stockage local SQLite).

---

## 2. Architecture Technique & Stack

### 2.1 Stack Logicielle

- **Backend :** FastAPI (Python), SQLAlchemy Async, SQLite (WAL mode).
- **Frontend :** React 19, TypeScript, Vite, TailwindCSS, shadcn/ui, Lucide-icons.
- **Moteur IA :** 
    - **Embeddings :** `MiniLM` (local) avec fallback vers providers cloud.
    - **LLMs :** Système multi-fournisseurs avec rotation de clés et failover automatique (Gemini → Groq → Cerebras → Ollama).
- **Infrastructure :** Docker Compose (Backend uniquement). Frontend déployé sur Vercel.

### 2.2 Déploiement

| Composant | Plateforme | Conteneur |
|-----------|-----------|-----------|
| Frontend | Vercel | Non (SPA statique) |
| Backend | Docker Compose | Oui |
| Base de données | SQLite (fichier) | Volume Docker `lekki_db_data` |
| Stockage fichiers | Volume Docker `lekki_storage` | Oui |

Le conteneur backend expose le port 8000. Le frontend sur Vercel appelle l'API backend via `VITE_API_URL`.

### 2.3 Pipeline RAG

1. **Ingestion :** Support des formats PDF, DOCX, TXT, Markdown. Découpage récursif (chunking 512 / overlap 64). Vectorisation en `float32`.
2. **Requête (`/ask`) :** Vectorisation de la question, recherche par similarité cosinus (top-4), synthèse LLM avec les chunks comme contexte.
3. **Confiance :** Score basé sur la similarité du chunk le plus pertinent.

### 2.4 Système de Failover LLM

- **Ordre de priorité :** Gemini → Groq → Cerebras → Ollama (local).
- **Rotation de clés :** Bascule automatique sur la clé suivante en cas de quota/erreur.
- **Cooldown :** Une clé en échec est mise en pause temporairement.

---

## 3. Analyse Fonctionnelle

### 3.1 Gestion des Utilisateurs et Accès

- **Authentification :** JWT, mots de passe hachés.
- **Rôles :** `admin`, `editor`, `reader`.
- **Cloisonnement :** Chaque page, chunk RAG et conversation porte un `workspace_id`. Un utilisateur ne voit que les données des workspaces dont il est membre.

### 3.2 Workspaces

- Espace isolé. Pages, chunks RAG et conversations liés à un `workspace_id`.
- Gestion des membres avec rôles spécifiques au workspace.

### 3.3 Gestion Documentaire (Wiki)

- **Éditeur Markdown :** Mode édition et aperçu, catégories, statuts (`draft`, `published`).
- **Fonctions Intelligentes :** Résumé TL;DR, pages liées sémantiquement, recherche plein-texte (SQLite FTS5), indexation auto RAG.

### 3.4 Assistant IA (Lekki AI)

- Chat avec animation "token par token".
- Réponses sourcées et cliquables.
- Badge de confiance (Élevée / Moyenne / Faible).
- Mémoire conversationnelle (4 derniers échanges).
- Détection des salutations (small talk sans RAG).

### 3.5 Audit et Analytics

- **Knowledge Health Score :** Score global (0-100) de santé documentaire.
- **Analyse d'Obsolescence :** Score de "staleness" basé sur l'ancienneté et la fréquence de vue.
- **Analyse des Lacunes :** Questions sans réponse → suggestion de sujets à documenter.
- **Analytics d'Usage :** Top pages, top utilisateurs, volume de questions, performance des fournisseurs LLM.

### 3.6 Cartographie des Connaissances (Knowledge Map)

- Graphe interactif (nodes = pages, edges = similarités sémantiques).
- Clusters par thématiques.

---

## 4. Modèle de Données (Entités Clés)

- **User :** `id, username, email, password_hash, role`.
- **Workspace :** `id, name, description, owner_id`.
- **Page :** `id, workspace_id, title, content, category, status, summary, view_count, is_embedded`.
- **Chunk :** `id, page_id, content, embedding (vector)`.
- **Chat :** `id, user_id, workspace_id, title`.
- **Message :** `id, chat_id, role (user/assistant), content, sources (json)`.
- **RagQuery :** `id, user_id, question, confidence, provider, duration_ms`.
- **PageRelation :** `page_id, related_id, score`.
- **PageFlag :** `page_id, flag_type`.

---

## 5. Sauvegardes et Restauration

Lekki ne propose pas de synchronisation temps réel entre instances. Le mécanisme de redondance repose sur des sauvegardes fichier :

- **`scripts/backup.sh`** : Archive les volumes Docker (`lekki_db_data`, `lekki_storage`) sur le serveur distant.
- **`scripts/pull-backup.sh`** : Récupère la sauvegarde distante vers la machine locale via `rsync`/`ssh`.
- **`scripts/restore.sh`** : Restaure une archive dans les volumes Docker locaux.

Les opérations sont journalisées dans `logs/backup.log`, `logs/pull.log` et `logs/restore.log`.

Une sauvegarde automatique peut être planifiée via `cron` sur le serveur distant (exemple dans `crontab.remote`).
