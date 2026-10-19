# 🎓 Lekki — Le Hub Intelligent de Gestion des Savoirs

## 📌 Vision

Lekki n'est pas un simple gestionnaire de fichiers, c'est un **écosystème de synthèse et de gestion documentaire** conçu pour les étudiants et les équipes. L'objectif est de transformer un volume massif de documents de cours (PDF, Word, Notes) en une base de connaissances structurée, interrogeable et exploitable instantanément via une intelligence artificielle.

---

## 🔴 Le Problème

L'utilisateur moderne fait face à une "infobésité" documentaire :

- **Dispersion** : Les documents sont éparpillés entre drives personnels, groupes de discussion, emails et dossiers locaux.
- **Difficulté de Recherche** : Retrouver une notion précise dans un document est chronophage.
- **Surcharge Cognitive** : La synthèse manuelle de plusieurs documents est une tâche lourde et répétitive.
- **Absence de Structure** : Les documents sont souvent stockés en vrac sans lien logique entre eux.

---

## 🟢 La Solution : Lekki

Lekki centralise tout le périmètre documentaire de l'utilisateur et y injecte une couche d'intelligence contextuelle.

**Le concept :** 
`Documents Bruts` → `Extraction Structurée` → `Base de Connaissances (Wiki)` → `Interrogation IA`

Lekki permet de passer de la lecture passive à l'exploitation active du savoir.

---

## 🚀 Fonctionnalités Clés

### 📂 1. Gestion Documentaire Unifiée (Drive)

- **Centralisation** : Espace privé et espaces collaboratifs (Workspaces).
- **Ingestion Intelligente** : Extraction native du texte des PDF et DOCX sans passer par l'OCR, préservant la structure originelle.
- **Indexation Précise** : Suivi automatique des numéros de pages pour une attribution exacte des sources.

### 📖 2. Le Wiki Collaboratif

- **Hiérarchie Thématique** : Organisation rigoureuse des connaissances : `Pôle` → `Section` → `Page`.
- **Éditeur Haute Performance** : Interface de rédaction plein écran optimisée pour le contenu long-format et la synthèse professionnelle.
- **Statuts de pages** : Brouillon, Communautaire, Vérifiée.
- **Maillage** : Liaison bidirectionnelle entre les synthèses Wiki et les documents sources originaux.

### 🤖 3. Lekki AI (Assistant de Synthèse)

- **RAG (Retrieval-Augmented Generation)** : L'IA ne "devine" pas ; elle source ses réponses dans le périmètre documentaire accessible à l'utilisateur.
- **Citation précise** : Indication du document et de la page (ex: "p. 12").
- **Formatage Pédagogique** : Réponse directe, développement structuré, citations explicites des sources.
- **UX Naturelle** : Interface de chat avec effet de dactylographie.

---

## 🛠️ Architecture Technique

### Backend : Monolithe Modulaire

Lekki adopte une architecture modulaire en Python (FastAPI).

- **Pipeline d'Ingestion** :
  - Détection automatique des titres et sections via analyse des polices et styles.
  - Nettoyage des flux binaires pour garantir la qualité des données envoyées à l'IA.
- **Intelligence Artificielle** :
  - **Embeddings** : Modèles `MiniLM` pour la vectorisation du texte.
  - **Recherche Vectorielle** : Similarité cosinus pour l'extraction des passages les plus pertinents.
  - **Failover Chain** : Système de basculement automatique entre providers (`Gemini` → `Groq` → `Cerebras` → `Ollama Local`).

### Base de Données

- **SQLite** : base de données fichier, pas de serveur dédié à gérer.
- Persistance via volumes Docker (`lekki_db_data` et `lekki_storage`).

### 🏗️ Déploiement et Infrastructure

**Schéma de flux :**
`Utilisateur` → `Frontend (Vercel)` → `Backend (FastAPI, conteneur Docker)` → `SQLite / LLMs`

**Détails du déploiement :**

- **Frontend** : Déployé sur **Vercel** (pas de conteneur nécessaire, Vercel build et héberge le SPA).
- **Backend** : Image Python robuste hébergeant l'API FastAPI et les services de RAG, exécutée dans un conteneur Docker.
- **Orchestration (Docker Compose)** :
  - Gestion automatisée du cycle de vie du service backend.
  - **Persistance des données** : Utilisation de volumes Docker pour garantir que la base de données et les documents uploadés survivent au redémarrage des conteneurs.
  - **Réseau Isolé** : Création d'un réseau interne pour sécuriser la communication.
- **Santé du Système** : *Healthchecks* pour vérifier que le backend est opérationnel.

---

## 🔄 Sauvegardes et Redondance

Lekki ne propose pas de synchronisation temps réel entre plusieurs instances. En revanche, il offre un système de **sauvegarde et restauration** :

- **`scripts/backup.sh`** : Crée une archive des volumes Docker (base SQLite + stockage des fichiers) sur le serveur distant.
- **`scripts/pull-backup.sh`** : Récupère la sauvegarde la plus récente du serveur distant vers la machine locale.
- **`scripts/restore.sh`** : Restaure une archive dans les volumes Docker (écrase les données actuelles).

Cela permet de travailler en local après installation, de restaurer les données du serveur chez soi, et de disposer d'une redondance par sauvegardes régulières (cron sur le serveur distant).

---

## 🎯 Périmètre MVP (Produit Minimum Viable)

| Module | Fonctionnalités Incluses |
| :--- | :--- |
| **Auth & User** | Gestion sécurisée des comptes et des profils. |
| **Workspace** | Espaces de travail collaboratifs, gestion des membres et des accès. |
| **Drive** | Upload PDF/DOCX, indexation des pages, miniatures et snippets. |
| **Wiki** | Hiérarchie thématique, éditeur plein écran, maillage documentaire. |
| **Lekki AI** | Chat RAG, attribution multi-workspace, formatage pédagogique. |
| **Infrastructure** | Backend FastAPI, Base de données SQLite, Frontend React sur Vercel. |

---

## 💎 Proposition de Valeur

**Pour l'étudiant :** Moins de temps à chercher, plus de temps à comprendre. Un assistant personnel qui connaît tous ses cours par cœur.

**Pour le groupe :** Un cerveau collectif où les meilleures synthèses sont vérifiées, partagées et augmentées par l'IA.
