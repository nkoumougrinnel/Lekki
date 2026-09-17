# 🎓 Lekki — Le Hub Intelligent de Gestion des Savoirs Étudiants

## 📌 Vision
Lekki n'est pas un simple gestionnaire de fichiers, c'est un **écosystème de synthèse et de gestion documentaire** conçu spécifiquement pour les étudiants. L'objectif est de transformer un volume massif de documents de cours (PDF, Word, Notes) en une base de connaissances structurée, interrogeable et exploitable instantanément via une intelligence artificielle.

---

## 🔴 Le Problème
L'étudiant moderne fait face à une "infobésité" documentaire :
- **Dispersion** : Les cours sont éparpillés entre drives personnels, groupes WhatsApp, emails et dossiers locaux.
- **Difficulté de Recherche** : Retrouver une notion précise dans un PDF de 50 pages est chronophage.
- **Surcharge Cognitive** : La synthèse manuelle de plusieurs documents pour préparer un examen est une tâche lourde et répétitive.
- **Absence de Structure** : Les documents sont souvent stockés en vrac sans lien logique entre eux.

---

## 🟢 La Solution : Lekki
Lekki centralise tout le périmètre documentaire de l'utilisateur et y injecte une couche d'intelligence contextuelle.

**Le concept :** 
`Documents Bruts` $\to$ `Extraction Structurée` $\to$ `Base de Connaissances (Wiki)` $\to$ `Interrogation IA`

Lekki permet de passer de la lecture passive à l'exploitation active du savoir.

---

## 🚀 Fonctionnalités Clés

### 📂 1. Gestion Documentaire Unifiée (Drive)
- **Centralisation** : Espace privé et espaces collaboratifs (Workspaces).
- **Ingestion Intelligente** : Extraction automatique du texte des PDF et DOCX dès l'upload.
- **Prévisualisation Pro** : Affichage de miniatures (thumbnails) pour les PDF et extraits (snippets) pour les documents.

### 📖 2. Le Wiki Collaboratif
- **Structuration** : Organisation des connaissances par Pôle $\to$ Section $\to$ Page.
- **Synthèse Active** : Possibilité de créer des fiches de synthèse directement à partir d'un document source.
- **Certification** : Statuts de pages (Brouillon, Communautaire, Vérifiée) pour garantir la fiabilité des informations.
- **Maillage** : Liaison entre les pages Wiki et les documents sources originaux.

### 🤖 3. Lekki AI (L'Assistant de Synthèse)
- **RAG (Retrieval-Augmented Generation)** : L'IA ne "devine" pas ; elle source ses réponses dans les documents de l'utilisateur.
- **Attribution Transparente** : Chaque réponse mentionne précisément le document ou la page Wiki source.
- **Actions Rapides** :
  - *Expliquer* : Simplification d'un concept complexe avec exemple.
  - *Quiz* : Génération automatique de questions d'examen basées sur le cours.
  - *Résumé* : Extraction des points fondamentaux.

---

## 🛠️ Fonctionnement Technique

### Architecture "Monolithe Modulaire"
Lekki utilise une structure modulaire en Python (Backend) et React (Frontend) pour garantir une scalabilité maximale.

- **Pipeline d'Ingestion** : 
  - Utilisation de `PyMuPDF` et `python-docx` pour l'extraction native du texte.
  - Détection de la structure (titres, sections) via l'analyse des polices et styles.
- **Intelligence Artificielle** :
  - **Embeddings** : Utilisation de modèles `MiniLM` pour transformer le texte en vecteurs mathématiques.
  - **Recherche Vectorielle** : Calcul de la similarité cosinus pour trouver les passages les plus pertinents.
  - **Chaîne de Failover LLM** : Pour garantir une disponibilité 100%, Lekki bascule automatiquement entre plusieurs providers (Gemini $\to$ Groq $\to$ Cerebras $\to$ Ollama).

---

## 🎯 Périmètre MVP (Produit Minimum Viable)

Le MVP se concentre sur le flux critique de l'étudiant :

| Module | Fonctionnalités Incluses |
| :--- | :--- |
| **Auth & User** | Connexion, gestion du profil, switch de personas. |
| **Workspace** | Création d'espaces de travail, gestion des membres. |
| **Drive** | Upload PDF/DOCX, organisation en dossiers, miniatures. |
| **Wiki** | Création de pages, hiérarchie thématique, édition Markdown. |
| **Lekki AI** | Chat contextuel, recherche RAG, attribution des sources, quiz. |
| **Infrastructure** | Backend Python (FastAPI), Base de données SQLite/PostgreSQL. |

---

## 💎 Proposition de Valeur
**Pour l'étudiant :** Moins de temps à chercher, plus de temps à comprendre.
**Pour le groupe :** Un cerveau collectif où les meilleures synthèses sont vérifiées et partagées.
