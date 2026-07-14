#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-prod}"
if [[ "$ENV" != "prod" && "$ENV" != "homolog" ]]; then
  echo "Usage: $0 [prod|homolog]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CRON_LINE="5 7 * * * cd /opt/catechis && set -a && . ./.env.server && set +a && ./scripts/run-maintenance.sh ${ENV} >> /var/log/catechis-maintenance.log 2>&1"

chmod +x "${SCRIPT_DIR}/run-maintenance.sh"
(crontab -l 2>/dev/null | grep -v "run-maintenance.sh ${ENV}" || true; echo "${CRON_LINE}") | crontab -

echo "Maintenance cron installed for ${ENV}:"
crontab -l | grep "run-maintenance.sh ${ENV}"
