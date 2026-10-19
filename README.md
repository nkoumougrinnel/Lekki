# Lekki

Plateforme intelligente de gestion documentaire et d'assistance IA pour organiser ton savoir.

> « Centralise tes documents, organise-les comme un wiki, et discute avec eux. Lekki répond toujours en citant ses sources. »

Lekki rassemble tous tes documents (cours, PDF, notes, fichiers) en un seul endroit, les indexe et te permet de retrouver n'importe quelle information en posant une question naturelle. L'assistant Lekki AI fouille tes connaissances et te restitue une réponse sourcée, page et document à l'appui.

<p align="center"><img src="./docs/logo/icone_app.svg" alt="Lekki logo" width="250"></p>

---

## 🎯 Pourquoi Lekki ?

Tu as des documents éparpillés partout ? Des PDF de cours, des notes, des fichiers dans des drives différents ? Lekki centralise tout ça et te permet de :

- **Ranger tes documents** par thème, comme un wiki personnel ou partagé.
- **Retrouver n'importe quelle information** en posant une question naturelle.
- **Obtenir des réponses sourcées** : l'IA te dit exactement d'où vient chaque information (quel document, quelle page).
- **Travailler hors-ligne** et synchroniser tes données quand tu es de retour en ligne.

---

## ✨ Ce que tu peux faire avec Lekki

### 📂 Centraliser tes documents
Importe tes PDF, Word et fichiers texte. Lekki les indexe automatiquement pour que tu puisses les retrouver facilement.

### 📖 Créer ton propre wiki
Organise tes connaissances par thème, crée des pages, lie-les entre elles. Construis ta base de savoirs à ton rythme.

### 🤖 Discuter avec tes documents
Pose une question à Lekki AI. L'assistant fouille tes documents et te répond en citant précisément ses sources (document et page).

---

## 🚀 Démarrer rapidement

### En local (développement)

1. **Cloner le projet**
   ```bash
   git clone <url-du-depot>
   cd Lekki
   ```

2. **Lancer le backend**
   ```bash
   docker compose up -d backend
   ```

3. **Lancer le frontend**
   ```bash
   cd client
   npm install
   npm run dev
   ```

4. **Ouvrir Lekki** : [http://localhost:3000](http://localhost:3000)

Le backend tourne sur le port 8000, le frontend sur le port 3000.

---

## ☁️ En production

- **Frontend** : déployé sur **Vercel** (automatique, pas de configuration nécessaire).
- **Backend** : tourne dans un conteneur **Docker** avec sa base de données SQLite.
- **Sauvegardes** : tes données peuvent être sauvegardées automatiquement sur un serveur distant et restaurées chez toi quand tu en as besoin.

Consulte [`DEVOPS.md`](./DEVOPS.md) pour les procédures de déploiement, sauvegarde et restauration.

---

## 📁 Quoi trouver où

| Dossier | Contenu |
|---------|---------|
| `client/` | L'application web (React) que tu utilises au quotidien |
| `backend/` | L'API qui gère tes documents et l'assistant IA |
| `docs/` | Présentation et documentation du projet |
| `scripts/` | Outils de sauvegarde et restauration des données |
| `DEVOPS.md` | Guide d'exploitation (sauvegardes, déploiement, restauration) |

---

## 🤝 Contribuer

Lekki est un projet ouvert. N'hésite pas à proposer des améliorations, signaler des bugs ou partager des idées.

---

<p align="center">Fabriqué avec ❤️ pour organiser le savoir.</p>
