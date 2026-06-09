#!/usr/bin/env bash
# Marca migrações como applied quando o schema já existe (ex.: após db push em homolog).
# Uso: cd /opt/catechis && ./scripts/resolve-migrations-homolog.sh
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.homolog.yml}"
SCHEMA="../db/schema.prisma"

MIGRATIONS=(
  20260529173444_initial_migration
  20260529175641_add_multi_tenant
  20260529183207_auth_tables
  20260602000701_add_communication_hub
  20260602010000_rename_billing_plan_enum
  20260603000000_guardian_optional_user
  20260604204314_add_diocese_billing
  20260606002442_update
  20260606140000_add_two_factor_session_verified
)

for m in "${MIGRATIONS[@]}"; do
  echo "resolve --applied $m"
  docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "npx" server \
    prisma migrate resolve --applied "$m" --schema="$SCHEMA" || true
done

docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "npx" server \
  prisma migrate deploy --schema="$SCHEMA"

echo "Done. Restart server/worker if needed."
