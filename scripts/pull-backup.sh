#!/bin/bash
set -euo pipefail

LOG_DIR="./logs"
BACKUP_DIR="./backups"
mkdir -p "$LOG_DIR" "$BACKUP_DIR"
LOG_FILE="$LOG_DIR/pull.log"

REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_PATH="${REMOTE_PATH:-./backups}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

if [ -z "$REMOTE_HOST" ]; then
  log "ERREUR - REMOTE_HOST non defini (ex: export REMOTE_HOST=user@mon-serveur)"
  exit 1
fi

log "DEBUT TIRAGE SAUVEGARDE"
log "Serveur distant : $REMOTE_HOST"
log "Chemin distant : $REMOTE_PATH"

LATEST_BACKUP=$(ssh "$REMOTE_HOST" "ls -t $REMOTE_PATH/lekki_backup_*.tar.gz 2>/dev/null | head -n 1")

if [ -z "$LATEST_BACKUP" ]; then
  log "ERREUR - Aucune sauvegarde trouvee sur $REMOTE_HOST:$REMOTE_PATH"
  exit 1
fi

log "Sauvegarde distante identifiee : $LATEST_BACKUP"

rsync -avz "$REMOTE_HOST:$LATEST_BACKUP" "$BACKUP_DIR/"

log "Tirage termine : $(basename "$LATEST_BACKUP") vers $BACKUP_DIR/"
log "FIN TIRAGE SAUVEGARDE"
