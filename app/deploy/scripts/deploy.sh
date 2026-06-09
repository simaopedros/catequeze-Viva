#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-homolog}"
COMPOSE_FILE="docker-compose.homolog.yml"
if [[ "$ENV" == "prod" || "$ENV" == "production" ]]; then
  COMPOSE_FILE="docker-compose.yml"
fi

echo "Deploying to $ENV..."

docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" run --rm server npx prisma migrate deploy
docker compose -f "$COMPOSE_FILE" up -d

echo "Smoke test..."
API_URL="${WASP_SERVER_URL:-http://localhost:3001}"
curl -fsS "$API_URL/health" | grep -q '"status"'

echo "Deploy complete."
