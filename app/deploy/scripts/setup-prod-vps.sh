#!/usr/bin/env bash
# Bootstrap production VPS — run once on a fresh Contabo instance.
set -euo pipefail

echo "=== Catequese Viva — Production VPS bootstrap ==="

apt-get update
apt-get install -y docker.io docker-compose-plugin ufw curl

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

mkdir -p /opt/catechis/web-app /opt/catechis/scripts
chown -R root:root /opt/catechis

echo ""
echo "Next steps (manual):"
echo "  1. Copy app/deploy/* to /opt/catechis/"
echo "  2. Copiar app/.env.server.example → .env.server e preencher os segredos no VPS"
echo "  3. Configure Neon prod DATABASE_URL + Bunny zone catechis-prod"
echo "  4. Cloudflare DNS: @, familia, api → this VPS IP (proxied)"
echo "  5. GitHub secrets: PROD_SSH_HOST, PROD_SSH_USER, PROD_SSH_KEY"
echo "  6. GitHub variable: ENABLE_PROD_DEPLOY=true"
echo "  7. Tag v0.1.0 or workflow_dispatch → Deploy Production"
echo "  8. ./scripts/install-backup-cron.sh prod"
