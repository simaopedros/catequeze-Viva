#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-homolog}"
COMPOSE_FILE="docker-compose.homolog.yml"
CADDYFILE="Caddyfile.homolog"
if [[ "$ENV" == "prod" || "$ENV" == "production" ]]; then
  COMPOSE_FILE="docker-compose.yml"
  CADDYFILE="Caddyfile"
fi

echo "Deploying to $ENV..."

# Guard: SPA reverse proxy must forward same-origin /api/* to the backend.
# Without this, POST /api/chat-stream is answered with index.html (200) and SSE breaks.
if [[ -f "$CADDYFILE" ]]; then
  if ! grep -qE 'handle[[:space:]]+/api/\*' "$CADDYFILE"; then
    echo "ERROR: $CADDYFILE is missing 'handle /api/*' — chat-stream and other same-origin APIs will hit the SPA fallback."
    exit 1
  fi
  echo "Caddyfile OK: /api/* is routed to the backend."
else
  echo "WARN: $CADDYFILE not found in $(pwd); skipping /api/* proxy check."
fi

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
echo "After Caddy config changes, recreate/reload Caddy so /api/* is active, e.g.:"
echo "  docker compose -f $COMPOSE_FILE up -d --force-recreate caddy"
echo "Manual SSE check (authenticated session cookie/Bearer required):"
echo "  curl -N -X POST https://catechis.app/api/chat-stream -H 'Content-Type: application/json' -H 'Authorization: Bearer <session>' -d '{\"message\":\"ping\"}'"
