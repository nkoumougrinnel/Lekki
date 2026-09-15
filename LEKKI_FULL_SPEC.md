# 📘 Spécifications Exhaustives de Lekki Wiki

## 1. Vision et Proposition de Valeur
Lekki est une base de connaissances d'entreprise "Markdown-first" intégrant un pipeline **RAG (Retrieval-Augmented Generation)**. 
**Philosophie centrale :** *"Notre RAG ne devine pas — il cite."* 
L'objectif est de transformer des documents statiques en une intelligence interactive capable de répondre à des questions en sourçant précisément ses réponses dans la documentation interne, tout en garantissant la souveraineté des données (stockage local SQLite).

---

## 2. Architecture Technique & Stack
### 2.1 Stack Logicielle
- **Backend :** FastAPI (Python), SQLAlchemy Async, SQLite (WAL mode), Alembic (Migrations).
- **Frontend :** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, Lucide-react.
- **Moteur IA :** 
    - **Embeddings :** `all-MiniLM-L6-v2` (local via sentence-transformers) avec fallback Gemini.
    - **LLMs :** Système multi-fournisseurs avec rotation de clés et failover automatique.
- **Infrastructure :** Docker Compose (Backend + Frontend servi par Nginx).

### 2.2 Pipeline RAG (Le Cœur du Système)
1. **Ingestion :** 
    - Support des formats : PDF, DOCX, TXT, Markdown.
    - **Chunking :** Découpage récursif via `RecursiveCharacterTextSplitter` (taille 512, overlap 64).
    - **Vectorisation :** Chaque chunk est converti en vecteur `float32` et stocké en base.
2. **Requête (`/ask`) :**
    - La question est vectorisée avec le même modèle d'embedding.
    - **Recherche :** Calcul de la similarité cosinus entre la question et tous les chunks du workspace autorisé.
    - **Filtrage :** Top-4 des chunks les plus pertinents.
    - **Synthèse :** Le LLM reçoit la question + les chunks comme contexte $\to$ Génère la réponse.
    - **Confiance :** Le score de confiance est basé sur la similarité du chunk le plus pertinent.

### 2.3 Système de Failover LLM
Pour garantir une disponibilité de 100%, Lekki utilise un `LLMProviderManager` :
- **Ordre de priorité :** Gemini $\to$ Groq $\to$ Cerebras $\to$ Ollama (local).
- **Rotation de clés :** Si une clé API atteint son quota ou échoue, le système bascule sur la clé suivante du même fournisseur, puis sur le fournisseur suivant.
- **Cooldown :** Une clé en échec est mise en pause pendant X minutes avant d'être réessayée.

---

## 3. Analyse Fonctionnelle Détaillée

### 3.1 Gestion des Utilisateurs et Accès
- **Authentification :** JWT (HS256), mots de passe hachés via bcrypt.
- **Rôles et Permissions :**
    - `admin` : Contrôle total (utilisateurs, suppression, tous workspaces).
    - `editor` : Peut créer et modifier ses propres pages.
    - `reader` : Lecture seule.
- **Gestion des Profils :** Consultation et modification du rôle via l'interface admin.

### 3.2 Workspaces (Cloisonnement des Données)
- **Concept :** Un Workspace est un espace isolé. Pages, chunks RAG et conversations sont liés à un `workspace_id`.
- **Isolation :** Un utilisateur ne peut voir ou interroger via l'IA que les données des workspaces dont il est membre.
- **Gestion :** Création de workspaces, ajout/suppression de membres avec rôles spécifiques au workspace.

### 3.3 Gestion Documentaire (Wiki)
- **Éditeur Markdown :** 
    - Mode édition et mode aperçu.
    - Gestion des catégories (ex: RH, Technique, Commercial).
    - Statuts : `draft` (privé) et `published` (public).
- **Fonctions Intelligentes :**
    - **Résumé TL;DR :** Génération automatique d'un résumé de page via LLM.
    - **Pages Liées :** Calcul automatique des 3 pages les plus proches sémantiquement.
    - **Recherche FTS5 :** Recherche plein-texte ultra-rapide via SQLite FTS5.
    - **Indexation Auto :** Toute modification de page déclenche une ré-indexation RAG en arrière-plan.

### 3.4 Assistant IA (Lekki AI)
- **Interaction :** Chatbot avec animation "token par token" (machine à écrire).
- **RAG & Sources :** 
    - Chaque réponse liste les sources utilisées.
    - Les sources sont cliquables et ouvrent directement la page correspondante.
    - Affichage d'un badge de confiance (Élevée/Moyenne/Faible).
- **Mémoire Conversationnelle :** Injection des 4 derniers échanges dans le prompt pour gérer les questions de suivi.
- **Small Talk :** Détection des salutations pour répondre sans solliciter le moteur RAG.

### 3.5 Audit et Analytics (Intelligence Métier)
- **Knowledge Health Score :** Score global (0-100) de la santé de la base documentaire.
- **Analyse d'Obsolescence :** Calcul d'un score de "staleness" basé sur l'ancienneté et la fréquence de vue.
- **Analyse des Lacunes :** Identification des questions sans réponse $\to$ Suggestion de sujets à documenter.
- **Analytics d'Usage :** 
    - Top pages consultées.
    - Top utilisateurs.
    - Volume de questions par jour.
    - Performance et usage des fournisseurs LLM.

### 3.6 Cartographie des Connaissances (Knowledge Map)
- **Visualisation :** Graphe interactif (React Flow).
- **Nœuds :** Représentent les pages (colorés par catégorie).
- **Liens :** Représentent les similarités sémantiques calculées entre les embeddings de pages.
- **Clusters :** Regroupements automatiques par thématiques.

---

## 4. Inventaire des Écrans et Interface (UI Map)

### 4.1 Écrans d'Accès
- **Login Screen :** Formulaire de connexion (email/username + password).

### 4.2 Dashboard Principal
- **Sidebar (Style VS Code) :**
    - Section Favoris (étoiles).
    - Section Pages Privées.
    - Section Pages Publiques.
    - Bouton "+" pour création rapide.
- **Header :** 
    - Barre de recherche centrée (résultats live débouncés).
    - Sélecteur de Workspace.
    - Bouton "Carte des connaissances".
- **Zone Centrale :** Affichage de la page Markdown sélectionnée ou vue d'accueil.

### 4.3 Éditeur de Document
- **Interface :** Titre éditable, commutateur Aperçu/Édition, bouton d'enregistrement.
- **En-tête de page :** Badge de catégorie, bouton "Résumer", liste des pages liées.

### 4.4 Panneau IA (Lekki AI)
- **Interface :** Panneau latéral refermable avec bouton flottant.
- **Chat :** Historique des messages, champ de saisie, animation de réponse.
- **Rendu :** Markdown pour les réponses, cartes de sources avec barres de pertinence.

### 4.5 Tableaux de Bord Spécialisés (Dialogues Plein Écran)
- **Analytics Dashboard :** KPI, graphiques de tendances, tableaux des top contenus.
- **Audit Dashboard :** Score de santé, liste des pages obsolètes, suggestions de contenus manquants.
- **Knowledge Map Dialog :** Graphe interactif zoomable avec légende des catégories.
- **Import Dialog :** Upload multi-fichiers (PDF, etc.) avec barre de progression en %.
- **Workspace Members Dialog :** Liste des membres et gestion des rôles.

---

## 5. Modèle de Données (Entités Clés)
- **User :** `id, username, email, password_hash, role`.
- **Workspace :** `id, name, description, owner_id`.
- **Page :** `id, workspace_id, title, content, category, status, summary, view_count, is_embedded`.
- **Chunk :** `id, page_id, content, embedding (vector)`.
- **Chat :** `id, user_id, workspace_id, title`.
- **Message :** `id, chat_id, role (user/assistant), content, sources (json)`.
- **RagQuery :** `id, user_id, question, confidence, provider, duration_ms`.
- **PageRelation :** `page_id, related_id, score`.
- **PageFlag :** `page_id, flag_type (outdated, incorrect, etc.)`.
