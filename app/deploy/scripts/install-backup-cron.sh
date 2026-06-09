#!/usr/bin/env bash
# Install daily Neon → Bunny backup cron on the VPS.
# Usage: sudo ./install-backup-cron.sh homolog|prod
set -euo pipefail

ENV="${1:-homolog}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CRON_LINE="0 3 * * * cd /opt/catechis && set -a && source .env.server && set +a && ./scripts/backup-db.sh ${ENV} >> /var/log/catechis-backup.log 2>&1"

chmod +x "${SCRIPT_DIR}/backup-db.sh"

(crontab -l 2>/dev/null | grep -v "backup-db.sh ${ENV}" || true; echo "${CRON_LINE}") | crontab -

echo "Cron installed for ${ENV}:"
crontab -l | grep backup-db.sh
