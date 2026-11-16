#!/usr/bin/env bash
# Daily local backup with optional offsite rsync.
# Verified targets: Postgres container vps-infra-postgres-1 / DB alrifai_v2_phase3;
# uploads dir /opt/al-rifai-platform/uploads (mounted into the app container).
set -Eeuo pipefail

BACKUP_DIR="/var/backups/vps/al-rifai/daily"
DB_CONTAINER="vps-infra-postgres-1"
DB_NAME="alrifai_v2_phase3"
DB_USER="vps_pg_admin"
UPLOADS_DIR="/opt/al-rifai-platform/uploads"
OFFSITE_ENV="/opt/vps/config/offsite-backup.env"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG="/var/log/alrifai-backup.log"

mkdir -p "$BACKUP_DIR"
exec >>"$LOG" 2>&1
echo "=== backup start $(date -Is) ==="

DB_FILE="$BACKUP_DIR/db_${STAMP}.sql.gz"
UPLOADS_FILE="$BACKUP_DIR/uploads_${STAMP}.tar.gz"

# 1) Database dump (custom-free plain SQL, gzip; .tmp rename = atomic file).
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
    | gzip -9 > "${DB_FILE}.tmp"; then
  mv "${DB_FILE}.tmp" "$DB_FILE"
  gzip -t "$DB_FILE"
  echo "db_dump_ok $DB_FILE $(stat -c%s "$DB_FILE") bytes"
else
  rm -f "${DB_FILE}.tmp"
  echo "db_dump_FAILED"
  exit 1
fi

# 2) Uploads archive.
if [ -d "$UPLOADS_DIR" ]; then
  tar -czf "${UPLOADS_FILE}.tmp" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
  mv "${UPLOADS_FILE}.tmp" "$UPLOADS_FILE"
  tar -tzf "$UPLOADS_FILE" >/dev/null
  echo "uploads_ok $UPLOADS_FILE $(stat -c%s "$UPLOADS_FILE") bytes"
else
  echo "uploads_skipped missing $UPLOADS_DIR"
fi

# 3) Retention: local copies older than 7 days.
find "$BACKUP_DIR" -maxdepth 1 -type f -mtime +7 -delete
echo "retention_applied older_than_7d"

# 4) Offsite hook (never fails the local backup).
OFFSITE_DEST=""
if [ -r "$OFFSITE_ENV" ]; then
  # shellcheck disable=SC1090
  . "$OFFSITE_ENV"
  OFFSITE_DEST="${OFFSITE_DEST:-}"
fi

if [ -n "$OFFSITE_DEST" ]; then
  if rsync -avz --delete "$BACKUP_DIR/" "$OFFSITE_DEST"; then
    echo "offsite_ok $OFFSITE_DEST"
  else
    echo "offsite_FAILED $OFFSITE_DEST (local copy kept)"
  fi
else
  echo "Offsite destination not configured, keeping local copy only"
fi

echo "=== backup end $(date -Is) ==="
