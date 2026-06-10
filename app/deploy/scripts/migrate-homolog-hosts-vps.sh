#!/usr/bin/env bash
# Atualiza .env.server e recarrega Caddy/server após rename de hostnames homolog.
set -euo pipefail

cd /opt/catechis

if [[ ! -f .env.server ]]; then
  echo "ERROR: /opt/catechis/.env.server not found"
  exit 1
fi

cp -a .env.server ".env.server.bak.$(date +%Y%m%d%H%M%S)"

upsert() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env.server; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env.server
  else
    echo "${key}=${value}" >> .env.server
  fi
}

upsert WASP_WEB_CLIENT_URL "https://homolog.catechis.app"
upsert WASP_SERVER_URL "https://api-homolog.catechis.app"
upsert COOKIE_DOMAIN ".catechis.app"
upsert FAMILY_PORTAL_HOST "familia-homolog.catechis.app"
upsert STAFF_PORTAL_HOST "homolog.catechis.app"

# Legado (hostname antigo com dois níveis) — não é lido pelo server em runtime
if grep -q "^REACT_APP_FAMILY_PORTAL_HOST=" .env.server; then
  sed -i '/^REACT_APP_FAMILY_PORTAL_HOST=/d' .env.server
fi

echo "Updated .env.server. Run:"
echo "  docker compose -f docker-compose.homolog.yml up -d --no-deps --pull never --force-recreate caddy"
echo "  docker compose -f docker-compose.homolog.yml up -d --force-recreate server worker"
echo "Cloudflare DNS: A records familia-homolog + api-homolog → VPS IP (proxied)."
