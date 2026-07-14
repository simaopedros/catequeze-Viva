#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-prod}"
case "$ENV" in
  prod) BASE_URL="https://api.catechis.app" ;;
  homolog) BASE_URL="https://api-homolog.catechis.app" ;;
  *)
    echo "Usage: $0 [prod|homolog]" >&2
    exit 1
    ;;
esac

: "${MAINTENANCE_SECRET:?MAINTENANCE_SECRET must be set}"

curl --fail --silent --show-error \
  --max-time 300 \
  --request POST \
  --header "X-Maintenance-Secret: ${MAINTENANCE_SECRET}" \
  "${BASE_URL}/api/internal/maintenance"
echo
