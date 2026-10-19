#!/bin/bash
set -euo pipefail

LOG_DIR="./logs"
BACKUP_DIR="./backups"
mkdir -p "$LOG_DIR" "$BACKUP_DIR"
LOG_FILE="$LOG_DIR/backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="lekki_backup_$TIMESTAMP.tar.gz"
ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== DÉBUT SAUVEGARDE ==="
log "Archive cible : $ARCHIVE_PATH"
log "Utilisateur : $(whoami)"
log "Hôte : $(hostname)"

docker run --rm \
  -v lekki_db_data:/db_data:ro \
  -v lekki_storage:/storage:ro \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine sh -c "
    cd /tmp && rm -rf lekki && mkdir -p lekki/data lekki/storage &&
    cp -r /db_data/. lekki/data/ &&
    cp -r /storage/. lekki/storage/ &&
    tar czf /backup/$ARCHIVE_NAME -C /tmp lekki
  "

log "✅ Sauvegarde créée : $ARCHIVE_PATH"
log "=== FIN SAUVEGARDE ==="
