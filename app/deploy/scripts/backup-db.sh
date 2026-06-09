#!/usr/bin/env bash
set -euo pipefail

# Daily backup: pg_dump from Neon → Bunny Storage
# Requires: DATABASE_URL, BUNNY_STORAGE_* env vars

ENV="${1:-homolog}"
DATE=$(date +%Y-%m-%d)
FILE="backups/db/${ENV}/${DATE}.sql.gz"

: "${DATABASE_URL:?DATABASE_URL required}"
: "${BUNNY_STORAGE_ZONE:?BUNNY_STORAGE_ZONE required}"
: "${BUNNY_STORAGE_API_KEY:?BUNNY_STORAGE_API_KEY required}"
: "${BUNNY_STORAGE_HOSTNAME:?BUNNY_STORAGE_HOSTNAME required}"

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

pg_dump "$DATABASE_URL" | gzip > "$TMP"

curl -sf -X PUT \
  "https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${FILE}" \
  -H "AccessKey: ${BUNNY_STORAGE_API_KEY}" \
  -H "Content-Type: application/gzip" \
  --data-binary "@${TMP}"

echo "Backup uploaded: ${FILE}"
