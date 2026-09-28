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
- **Ingestion Intelligente** : Extraction native du texte des PDF et DOCX (via PyMuPDF et python-docx) sans passer par l'OCR, préservant la structure originelle.
- **Indexation Précise** : Suivi automatique des numéros de pages pour une attribution exacte des sources.

### 📖 2. Le Wiki Collaboratif (Professionnel)
- **Hiérarchie Thématique** : Organisation rigoureuse des connaissances : `Pôle` $\to$ `Section` $\to$ `Page`.
- **Éditeur Haute Performance** : Interface de rédaction plein écran optimisée pour le contenu long-format et la synthèse professionnelle.
- **Certification** : Statuts de pages (Brouillon, Communautaire, Vérifiée) pour garantir la fiabilité des informations partagées.
- **Maillage** : Liaison bidirectionnelle entre les synthèses Wiki et les documents sources originaux.

### 🤖 3. Lekki AI (L'Assistant de Synthèse Pédagogique)
- **RAG (Retrieval-Augmented Generation)** : L'IA ne "devine" pas ; elle source ses réponses dans le périmètre documentaire accessible à l'utilisateur.
- **Attribution Omniprésente** : 
  - Citation précise du document et de la page (ex: "p. 12").
  - **Badges "Ext"** : Indication visuelle lorsque la source provient d'un workspace externe à celui actuellement consulté.
- **Formatage Pédagogique Strict** : Les réponses suivent une structure optimisée pour l'apprentissage :
  1. Réponse directe (1-2 phrases).
  2. Développement structuré (titres courts et puces concrètes).
  3. Citations explicites des sources.
- **UX Naturelle** : Interface de chat avec effet de dactylographie (Typing effect) pour une interaction fluide et humaine.

---

## 🛠️ Architecture Technique

### Backend : Monolithe Modulaire
Lekki adopte une architecture modulaire en Python (FastAPI) pour faciliter une future transition vers des microservices.

- **Pipeline d'Ingestion** :
  - Analyse des polices et styles pour détecter automatiquement les titres et sections.
  - Nettoyage des flux binaires (élimination des octets PDF bruts) pour garantir la qualité des données envoyées à l'IA.
- **Intelligence Artificielle** :
  - **Embeddings** : Modèles `MiniLM` pour la vectorisation du texte.
  - **Recherche Vectorielle** : Similarité cosinus pour l'extraction des passages les plus pertinents.
  - **Disponibilité Totale (Failover Chain)** : Système de basculement automatique entre providers pour garantir un service 24/7 :
    `Gemini 2.5` $\to$ `AgentRouter` $\to$ `Groq` $\to$ `Ollama (Local)`

### 🏗️ Déploiement et Infrastructure
Lekki est conçu pour être déployé de manière isolée et reproductible via une stratégie de **conteneurisation complète**.

**Schéma de flux :**
`Utilisateur` $\to$ `Frontend (React + Nginx)` $\to$ `Backend (FastAPI)` $\to$ `Base de Données / LLMs`

**Détails du déploiement :**
- **Conteneurisation (Docker)** :
  - **Frontend** : Une image optimisée contenant le build de l'application React, servie par un serveur **Nginx** pour une performance maximale et une gestion efficace du routage SPA.
  - **Backend** : Une image Python robuste hébergeant l'API FastAPI et les services de RAG.
- **Orchestration (Docker Compose)** :
  - Gestion automatisée du cycle de vie des services.
  - **Persistance des données** : Utilisation de volumes Docker pour garantir que la base de données et les documents uploadés survivent au redémarrage des conteneurs.
  - **Réseau Isolé** : Création d'un réseau interne (`lekki_net`) pour sécuriser la communication entre le frontend et le backend.
- **Santé du Système** : Implémentation de *Healthchecks* pour s'assurer que le frontend ne démarre que lorsque le backend est pleinement opérationnel.

---

## 🎯 Périmètre MVP (Produit Minimum Viable)

| Module | Fonctionnalités Incluses |
| :--- | :--- |
| **Auth & User** | Gestion sécurisée des comptes et des profils. |
| **Workspace** | Espaces de travail collaboratifs, gestion des membres et des accès. |
| **Drive** | Upload PDF/DOCX, indexation des pages, miniatures et snippets. |
| **Wiki** | Hiérarchie thématique, éditeur plein écran, maillage documentaire. |
| **Lekki AI** | Chat RAG, attribution multi-workspace, formatage pédagogique. |
| **Infrastructure** | Backend FastAPI, Base de données SQLite/PostgreSQL, Frontend React. |

---

## 💎 Proposition de Valeur
**Pour l'étudiant :** Moins de temps à chercher, plus de temps à comprendre. Un assistant personnel qui connaît tous ses cours par cœur.
**Pour le groupe :** Un cerveau collectif où les meilleures synthèses sont vérifiées, partagées et augmentées par l'IA.
