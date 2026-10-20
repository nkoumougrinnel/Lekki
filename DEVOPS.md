# 📋 Procédures DevOps — Lekki

Architecture : Frontend sur **Vercel**, Backend en **conteneur Docker** (FastAPI + SQLite), sauvegardes distantes → locales.

---

## 1. Architecture

```
Utilisateur
    │
    ▼
Frontend (Vercel, port 3000) ─────► Backend (conteneur Docker, port 8000)
                                                    │
                                                    ▼
                                              SQLite (volume lekki_db_data)
                                              Storage (volume lekki_storage)
```

- **Frontend** : déployé sur Vercel, pas de conteneur.
- **Backend** : conteneur Docker (`docker-compose.yml`), base de données SQLite dans le volume `lekki_db_data`, fichiers dans `lekki_storage`.
- **Sauvegardes** : tirées du serveur distant vers la machine locale via `rsync`/`ssh`, puis restaurées localement si besoin.

---

## 2. Lancer le backend en local

### Prérequis
- Docker et Docker Compose installés
- Variables d'environnement dans `.env` à la racine (voir `.env.example`)

### Commande
```bash
cd /home/germain/MyProjects/Lekki
docker compose up -d
```

Le backend écoute sur `http://localhost:8000`.

### Lancer le frontend en local
```bash
cd client
npm run dev
```
Le frontend écoute sur `http://localhost:3000` et proxy `/api` vers `http://localhost:8000`.

---

## 3. Sauvegarder le serveur distant (via Railway)

Sur la machine locale, exécuter :

```bash
railway ssh --project=<PROJECT_ID> --environment=<ENVIRONMENT> --service=backend \
  -- /app/scripts/backup.sh
```

Cela lance le script `backup.sh` à l'intérieur du conteneur backend sur Railway. Le script crée une archive `lekki_backup_YYYYMMDD_HHMMSS.tar.gz` dans le dossier `/app/backups/` du conteneur et journalise l'opération dans `/app/logs/backup.log`.

**Remplacer** `<PROJECT_ID>` et `<ENVIRONMENT>` par les valeurs de ton projet Railway.

---

## 4. Tirer une sauvegarde du serveur distant vers la machine locale

Sur ta machine locale :

```bash
export REMOTE_HOST=user@mon-serveur-distant
./scripts/pull-backup.sh
```

Le script :
1. Se connecte en SSH au serveur distant
2. Identifie la sauvegarde la plus récente (`lekki_backup_*.tar.gz`)
3. La récupère via `rsync` dans `./backups/` en local
4. Journalise l'opération dans `./logs/pull.log`

**Prérequis** : clé SSH configurée pour se connecter sans mot de passe au serveur distant.

---

## 5. Restaurer une sauvegarde en local

Sur ta machine locale :

```bash
./scripts/restore.sh ./backups/lekki_backup_YYYYMMDD_HHMMSS.tar.gz
```

Le script :
1. Arrête et vide les volumes Docker `lekki_db_data` et `lekki_storage`
2. Extrait l'archive dans ces volumes
3. Journalise l'opération dans `./logs/restore.log`

Après restauration, redémarrer le conteneur backend :

```bash
docker compose up -d
```

---

## 6. Vider complètement la base de données (remise à zéro)

Pour supprimer **toutes les données** de la base SQLite et du stockage (remise à zéro totale) :

```bash
# 1) Arrêter et supprimer le conteneur
docker compose down

# 2) Supprimer les volumes Docker (données + stockage)
docker volume rm lekki_lekki_db_data lekki_lekki_storage

# 3) Redémarrer le backend avec des volumes vierges
docker compose up -d
```

> ⚠️ Cette opération est **irréversible** : toute la base de données et tous les fichiers uploadés sont perdus. Les volumes sont recréés vides.

---

## 7. Utiliser Ollama local (hors-ligne)

Ollama peut servir de fournisseur LLM de secours quand il n'y a pas de connexion internet.

### Lancer Ollama accessible depuis le conteneur

Ollama doit écouter sur toutes les interfaces (pas seulement `localhost`) pour que le conteneur Docker puisse l'atteindre :

```bash
# Sur ta machine hôte (pas dans Docker)
OLLAMA_HOST=0.0.0.0 ollama serve
```

Le conteneur backend est configuré pour appeler `http://host.docker.internal:11434` (résolu automatiquement vers l'hôte via `extra_hosts`).

### Vérifier l'accès depuis le conteneur

```bash
docker compose exec backend curl http://host.docker.internal:11434/api/tags
```

Si la commande retourne la liste des modèles, Ollama est joignable. Le backend basculera automatiquement sur Ollama quand les providers cloud (Gemini, Groq, Cerebras) sont indisponibles.

---

## 9. Sauvegarde automatique du serveur distant (cron)

Sur le serveur distant (dans le conteneur backend ou sur l'hôte), ajouter une entrée cron :

```bash
crontab -e
```

Ajouter la ligne suivante (exemple : tous les jours à 3h00) :

```
0 3 * * * /app/scripts/backup.sh >> /app/logs/cron-backup.log 2>&1
```

### Modifier la fréquence
- `0 3 * * *` → tous les jours à 3h00
- `0 */6 * * *` → toutes les 6 heures
- `30 2 * * 0` → tous les dimanches à 2h30

Le fichier `crontab.remote` à la racine du projet contient un exemple de ligne cron.

### Logs du cron
Les exécutions automatiques sont journalisées dans `logs/cron-backup.log` sur le serveur distant.

---

## 10. Logs et traçabilité

| Opération | Fichier de log | Lieu |
|-----------|---------------|------|
| Sauvegarde distante | `logs/backup.log` | Serveur distant |
| Tirage distant → local | `logs/pull.log` | Machine locale |
| Restauration locale | `logs/restore.log` | Machine locale |
| Sauvegarde auto (cron) | `logs/cron-backup.log` | Serveur distant |

Chaque entrée contient : timestamp, utilisateur, hôte, archive concernée et statut (succès/échec).

---

## 11. Récapitulatif des commandes

```bash
# Backend local
docker compose up -d          # Démarrer le backend
docker compose down           # Arrêter le backend

# Frontend local
cd client && npm run dev      # Démarrer le frontend (port 3000)

# Sauvegarde sur serveur distant (via Railway)
railway ssh --project=<ID> --environment=<ENV> --service=backend -- /app/scripts/backup.sh

# Tirage de sauvegarde vers la machine locale
export REMOTE_HOST=user@mon-serveur
./scripts/pull-backup.sh

# Restauration en local
./scripts/restore.sh ./backups/lekki_backup_YYYYMMDD_HHMMSS.tar.gz

# Voir les logs
cat logs/pull.log
cat logs/restore.log
```

---

## 12. Fichiers à la racine

| Fichier / Dossier | Rôle |
|-------------------|------|
| `docker-compose.yml` | Orchestration du backend (SQLite uniquement) |
| `scripts/backup.sh` | Sauvegarde des volumes Docker (distant) |
| `scripts/pull-backup.sh` | Récupération d'une sauvegarde distante vers local |
| `scripts/restore.sh` | Restauration d'une archive dans les volumes Docker |
| `crontab.remote` | Exemple de ligne cron pour sauvegarde auto distante |
| `deploy/vercel.json` | Configuration déploiement frontend Vercel |
| `deploy/metadata.json` | Métadonnées du projet |
| `docs/` | Documentation et présentation |
| `.gitignore` | Ignore `node_modules`, `dist`, `backups/`, `logs/`, `.env` |
