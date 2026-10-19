#!/bin/bash
set -euo pipefail

LOG_DIR="./logs"
BACKUP_DIR="./backups"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/restore.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

ARCHIVE="${1:?Usage: $0 <archive.tar.gz>}"

if [ ! -f "$ARCHIVE" ]; then
  log "❌ ÉCHEC - Fichier introuvable : $ARCHIVE"
  exit 1
fi

log "=== DÉBUT RESTAURATION ==="
log "Archive source : $ARCHIVE"
log "Utilisateur : $(whoami)"
log "Hôte : $(hostname)"

docker run --rm \
  -v lekki_db_data:/db_data \
  -v lekki_storage:/storage \
  -v "$(pwd)/$ARCHIVE":/backup/archive.tar.gz:ro \
  alpine sh -c "
    rm -rf /db_data/* /storage/* &&
    tar xzf /backup/archive.tar.gz -C /tmp &&
    cp -r /tmp/lekki/data/. /db_data/ &&
    cp -r /tmp/lekki/storage/. /storage/
  "

log "✅ Restauration terminée : $ARCHIVE"
log "=== FIN RESTAURATION ==="
