#!/bin/bash
# Sync Stripe Price IDs to remote .env.server
# Usage: ./deploy/scripts/sync-env-stripe.sh user@host [remote_path]
#
# Fill the placeholders below from the Stripe Dashboard (never commit live IDs).
# Examples:
#   ./deploy/scripts/sync-env-stripe.sh root@catechis.app
#   ./deploy/scripts/sync-env-stripe.sh root@catechis.app /opt/catequese-viva/app

set -euo pipefail

SSH_HOST="${1:?Usage: $0 user@host [remote_path]}"
REMOTE_PATH="${2:-/opt/catequese-viva/app}"

cat <<'PRICES' | ssh "$SSH_HOST" "cat >> $REMOTE_PATH/.env.server"

# ─── Catequese Viva plans (Stripe Price IDs) ──────────────────────────────
# Cole os Price IDs do Stripe Dashboard no VPS. Não commitar IDs reais.
# USD (monthly)
STRIPE_CATECHIST_PRO_PLAN_ID=price_xxxxxxxx
STRIPE_CATECHIST_AI_PLAN_ID=price_xxxxxxxx
STRIPE_PARISH_ESSENTIAL_PLAN_ID=price_xxxxxxxx
STRIPE_PARISH_COMPLETE_PLAN_ID=price_xxxxxxxx
STRIPE_DIOCESE_PLAN_ID=price_xxxxxxxx
STRIPE_AI_CREDITS_20_PLAN_ID=price_xxxxxxxx
STRIPE_AI_CREDITS_50_PLAN_ID=price_xxxxxxxx
# USD (annual)
STRIPE_CATECHIST_PRO_ANNUAL_PLAN_ID=price_xxxxxxxx
STRIPE_CATECHIST_AI_ANNUAL_PLAN_ID=price_xxxxxxxx
STRIPE_PARISH_ESSENTIAL_ANNUAL_PLAN_ID=price_xxxxxxxx
STRIPE_PARISH_COMPLETE_ANNUAL_PLAN_ID=price_xxxxxxxx
STRIPE_DIOCESE_ANNUAL_PLAN_ID=price_xxxxxxxx
# BRL (monthly)
STRIPE_CATECHIST_PRO_BRL_PLAN_ID=price_xxxxxxxx
STRIPE_CATECHIST_AI_BRL_PLAN_ID=price_xxxxxxxx
STRIPE_PARISH_ESSENTIAL_BRL_PLAN_ID=price_xxxxxxxx
STRIPE_PARISH_COMPLETE_BRL_PLAN_ID=price_xxxxxxxx
STRIPE_DIOCESE_BRL_PLAN_ID=price_xxxxxxxx
STRIPE_AI_CREDITS_20_BRL_PLAN_ID=price_xxxxxxxx
STRIPE_AI_CREDITS_50_BRL_PLAN_ID=price_xxxxxxxx
# BRL (annual)
STRIPE_CATECHIST_PRO_ANNUAL_BRL_PLAN_ID=price_xxxxxxxx
STRIPE_CATECHIST_AI_ANNUAL_BRL_PLAN_ID=price_xxxxxxxx
STRIPE_PARISH_ESSENTIAL_ANNUAL_BRL_PLAN_ID=price_xxxxxxxx
STRIPE_PARISH_COMPLETE_ANNUAL_BRL_PLAN_ID=price_xxxxxxxx
STRIPE_DIOCESE_ANNUAL_BRL_PLAN_ID=price_xxxxxxxx
PRICES

echo "✅ Stripe Price ID placeholders appended to $REMOTE_PATH/.env.server on $SSH_HOST"
echo "⚠️  Replace price_xxxxxxxx on the VPS, then restart the app."
