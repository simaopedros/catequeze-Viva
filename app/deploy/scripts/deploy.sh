#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-homolog}"
COMPOSE_FILE="docker-compose.homolog.yml"
if [[ "$ENV" == "prod" || "$ENV" == "production" ]]; then
  COMPOSE_FILE="docker-compose.yml"
fi

echo "Deploying to $ENV..."

docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "npx" server prisma migrate deploy --schema=../db/schema.prisma
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Smoke test (in-container health)..."
docker compose -f "$COMPOSE_FILE" exec -T server node -e "
  fetch('http://127.0.0.1:3001/health')
    .then((r) => r.json())
    .then((j) => {
      if (j.status !== 'ok') { console.error(j); process.exit(1); }
      console.log('Health OK:', JSON.stringify(j));
    });
"

echo "Deploy complete."
