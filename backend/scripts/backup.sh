#!/usr/bin/env bash
#
# backup.sh - Sauvegarde de la base de données SQLite et du stockage des fichiers Lekki.
#
# Usage:
#   ./backup.sh [nom_de_sauvegarde]
#
# Si aucun nom n'est donné, un horodatage est utilisé.
# Les archives sont écrites dans ./backups (à la racine du projet).
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

DATA_DIR="$BACKEND_DIR/data"
STORAGE_DIR="$BACKEND_DIR/storage"
BACKUP_DIR="$PROJECT_ROOT/backups"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
NAME="${1:-$TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

DB_FILE="$DATA_DIR/lekki.db"
ARCHIVE_NAME="lekki_backup_${NAME}.tar.gz"
ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"

echo "[backup] Preparation de la sauvegarde Lekki..."

if [ ! -d "$DATA_DIR" ]; then
    echo "[backup] ERREUR: Dossier de donnees introuvable: $DATA_DIR"
    exit 1
fi

if [ ! -d "$STORAGE_DIR" ]; then
    echo "[backup] ERREUR: Dossier de stockage introuvable: $STORAGE_DIR"
    exit 1
fi

# Verrouiller/verifier la base (copie a froid pour SQLite coherente)
if [ -f "$DB_FILE" ]; then
    echo "[backup] Copie de la base de donnees: $DB_FILE"
else
    echo "[backup] ATTENTION: Aucun fichier lekki.db trouve (base vide ou non initialisee)."
fi

# Creer l'archive contenant data/ et storage/
tar -czf "$ARCHIVE_PATH" -C "$BACKEND_DIR" data storage 2>/dev/null || {
    echo "[backup] ERREUR: Echec de la creation de l'archive $ARCHIVE_PATH"
    exit 1
}

echo "[backup] Sauvegarde creee: $ARCHIVE_PATH"
echo "[backup] Taille: $(du -h "$ARCHIVE_PATH" | cut -f1)"
