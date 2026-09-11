#!/usr/bin/env bash
# Seed local test fixtures. Password for all seed users: Teste@123
set -euo pipefail
cd "$(dirname "$0")"

if [ -z "${DATABASE_URL:-}" ] && [ -f .env.server ]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' .env.server | tail -n1 | cut -d= -f2-)"
  export DATABASE_URL
fi

exec node seed_test_data.js "$@"
