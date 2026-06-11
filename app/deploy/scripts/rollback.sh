#!/usr/bin/env bash
# Rollback production to a previous image tag.
# Usage: ./rollback.sh <image-tag>
# Example: ./rollback.sh prod-060ee02bbc28f431fa90c6df67ac606a6cfe2b4d
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <image-tag>"
  echo "Available prod images:"
  docker images ghcr.io/simaopedros/catequeze-viva --format '{{.Tag}}' 2>/dev/null | grep '^prod-' || echo "  (none cached locally — pull from GHCR)"
  echo ""
  echo "Or list remote tags:"
  echo "  curl -s 'https://api.github.com/repos/simaopedros/catequeze-viva/packages/container/catequeze-viva/versions' | ..."
  exit 1
fi

TAG="$1"
IMAGE="ghcr.io/simaopedros/catequeze-viva:${TAG}"

cd "$(dirname "$0")/.."

echo "=== Rollback para ${IMAGE} ==="
echo ""

echo "1. Fazer backup pré-rollback..."
set -a && source .env.server && set +a
DATE=$(date +%Y-%m-%d-%H%M)
BACKUP_FILE="backups/db/prod/pre-rollback/${DATE}.sql.gz"
pg_dump --no-owner --no-acl "$DATABASE_URL" 2>/dev/null | gzip > "/tmp/rollback-backup.sql.gz"
curl -sf -X PUT \
  "https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${BACKUP_FILE}" \
  -H "AccessKey: ${BUNNY_STORAGE_API_KEY}" \
  -H "Content-Type: application/gzip" \
  --data-binary @/tmp/rollback-backup.sql.gz
rm /tmp/rollback-backup.sql.gz
echo "   Backup: ${BACKUP_FILE}"
echo ""

echo "2. Parar containers atuais..."
docker compose -f docker-compose.yml down
echo ""

echo "3. Iniciar com imagem ${TAG}..."
IMAGE="${IMAGE}" docker compose -f docker-compose.yml up -d
sleep 10
echo ""

echo "4. Executar migrations (se necessário)..."
docker compose -f docker-compose.yml run --rm --entrypoint "npx" server prisma migrate deploy --schema=../db/schema.prisma || echo "⚠️ migrate deploy failed"
echo ""

echo "5. Health check..."
sleep 5
if curl -fsS https://api.catechis.app/health; then
  echo ""
  echo "✅ Rollback concluído. Imagem: ${TAG}"
else
  echo ""
  echo "❌ Health check falhou! A reverter para prod-latest..."
  IMAGE="ghcr.io/simaopedros/catequeze-viva:prod-latest" docker compose -f docker-compose.yml up -d
  echo "   Restaurado para prod-latest. Verifica o problema."
fi
