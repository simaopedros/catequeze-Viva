#!/usr/bin/env bash
set -euo pipefail

# Seed homolog with pastoral test data (run once after first deploy).
docker compose -f docker-compose.homolog.yml exec server node -e "
  console.log('Run wasp db seed on homolog via CI or manual SSH.');
"

echo "See app/docs/HOMOLOG.md for the full pastoral QA checklist."
