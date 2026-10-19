#!/usr/bin/env bash
#
# restore.sh - Restauration d'une sauvegarde Lekki (base SQLite + stockage fichiers).
#
# Usage:
#   ./restore.sh chemin/vers/lekki_backup_XXXX.tar.gz
#
# L'archive doit contenir les dossiers data/ et storage/ a sa racine.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

DATA_DIR="$BACKEND_DIR/data"
STORAGE_DIR="$BACKEND_DIR/storage"

ARCHIVE="${1:-}"

if [ -z "$ARCHIVE" ]; then
    echo "Usage: $0 chemin/vers/lekki_backup_XXXX.tar.gz"
    echo ""
    echo "Sauvegardes disponibles dans ./backups/:"
    ls -1 "$PROJECT_ROOT/backups/" 2>/dev/null || echo "(aucune)"
    exit 1
fi

if [ ! -f "$ARCHIVE" ]; then
    echo "[restore] ERREUR: Fichier introuvable: $ARCHIVE"
    exit 1
fi

echo "[restore] Debut de la restauration depuis: $ARCHIVE"

# Arreter le backend avant de restaurer (conseille)
echo "[restore] Assurez-vous que le conteneur backend est arrete avant de continuer."
echo "[restore] Appuyez sur Entree pour continuer, ou Ctrl+C pour annuler."
read -r

# Preparer les dossiers cibles
mkdir -p "$DATA_DIR" "$STORAGE_DIR"

# Supprimer le contenu actuel pour une restauration propre
echo "[restore] Nettoyage des donnees actuelles..."
rm -rf "$DATA_DIR"/* "$STORAGE_DIR"/* 2>/dev/null || true

# Extraire l'archive
echo "[restore] Extraction de l'archive..."
tar -xzf "$ARCHIVE" -C "$BACKEND_DIR"

echo "[restore] Restauration terminee."
echo "[restore] Base de donnees: $DATA_DIR"
echo "[restore] Stockage fichiers: $STORAGE_DIR"
echo ""
echo "[restore] Vous pouvez maintenant redemarrer le conteneur backend."
echo "[restore]   docker compose up -d backend"
