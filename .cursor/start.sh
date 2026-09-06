#!/usr/bin/env bash
# Per-boot startup for the Catequese Viva Cloud Agent environment.
#
# Reconciles runtime state that does not survive a reboot: starts PostgreSQL,
# ensures the dev role/database exist, and applies any pending committed
# migrations. Must be idempotent and must return (the dev server itself runs as
# a persistent terminal, not here).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$REPO_ROOT/app"

# shellcheck disable=SC1091
source "$REPO_ROOT/.cursor/setup-path.sh"

# Start PostgreSQL (no-op if already running) and wait for readiness.
sudo pg_ctlcluster 16 main start 2>/dev/null || true
for _ in $(seq 1 30); do
  pg_isready -h localhost -q && break || sleep 1
done

# Ensure role + database exist (fresh disk without a captured cluster).
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='wasp'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE wasp WITH LOGIN PASSWORD 'wasp' CREATEDB SUPERUSER;"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='catequese_dev'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE catequese_dev OWNER wasp;"

# Apply committed migrations if the generated schema is available.
if [ -f "$APP_DIR/.wasp/out/db/schema.prisma" ]; then
  cd "$APP_DIR"
  DATABASE_URL="$DEV_DATABASE_URL" node node_modules/.bin/prisma migrate deploy \
    --schema .wasp/out/db/schema.prisma || true
fi

echo "[start] PostgreSQL ready; migrations applied."
