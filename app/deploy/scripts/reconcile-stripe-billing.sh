#!/usr/bin/env bash
# Reconcilia assinatura Stripe → User no Neon quando webhooks falharam (ex. HTTP 400).
# Uso no VPS homolog:
#   cd /opt/catechis
#   bash scripts/reconcile-stripe-billing.sh simaopedros@gmail.com
#   bash scripts/reconcile-stripe-billing.sh --resend-last-invoice simaopedros@gmail.com
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.homolog.yml}"
EMAIL="${1:-}"
RESEND="${RESEND:-false}"

if [[ "${1:-}" == "--resend-last-invoice" ]]; then
  RESEND=true
  EMAIL="${2:-}"
fi

if [[ -z "$EMAIL" ]]; then
  echo "Usage: $0 <email>"
  echo "       $0 --resend-last-invoice <email>"
  exit 1
fi

cd /opt/catechis

echo "=== Env no container ==="
docker compose -f "$COMPOSE_FILE" exec -T server printenv STRIPE_CATECHIST_PRO_PLAN_ID || true
docker compose -f "$COMPOSE_FILE" exec -T server sh -c 'test -n "$STRIPE_WEBHOOK_SECRET" && echo STRIPE_WEBHOOK_SECRET=set || echo STRIPE_WEBHOOK_SECRET=MISSING'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Reconcile $EMAIL ==="
docker compose -f "$COMPOSE_FILE" exec -T \
  -e RECONCILE_EMAIL="$EMAIL" \
  -e RESEND_FAILED_WEBHOOK="$RESEND" \
  -w /app/.wasp/out/server \
  server node --input-type=module - < "$SCRIPT_DIR/reconcile-stripe-billing.mjs"
