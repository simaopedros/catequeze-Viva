#!/bin/bash
# Sync Stripe Price IDs to remote .env.server
# Usage: ./deploy/scripts/sync-env-stripe.sh user@host [remote_path]
#
# Examples:
#   ./deploy/scripts/sync-env-stripe.sh root@catechis.app
#   ./deploy/scripts/sync-env-stripe.sh root@catechis.app /opt/catequese-viva/app

set -euo pipefail

SSH_HOST="${1:?Usage: $0 user@host [remote_path]}"
REMOTE_PATH="${2:-/opt/catequese-viva/app}"

# ─── Stripe Price IDs ─────────────────────────────────────────────────────
# ⚠️  Edit these with your production sk_live_ Price IDs before running.
# The values below are TEST MODE — replace for production deploy.
# ──────────────────────────────────────────────────────────────────────────

cat <<'PRICES' | ssh "$SSH_HOST" "cat >> $REMOTE_PATH/.env.server"

# ─── Catequese Viva plans (Stripe Price IDs) ──────────────────────────────
# USD (monthly)
STRIPE_CATECHIST_PRO_PLAN_ID=price_1Th8rpLlEZ4s7RNR4PT2dk8u
STRIPE_CATECHIST_AI_PLAN_ID=price_1Th8tLLlEZ4s7RNRiOxVFY2U
STRIPE_PARISH_ESSENTIAL_PLAN_ID=price_1Th8vALlEZ4s7RNRRNfX2APe
STRIPE_PARISH_COMPLETE_PLAN_ID=price_1Th8w2LlEZ4s7RNRfX6VFKv4
STRIPE_DIOCESE_PLAN_ID=price_1Th8wqLlEZ4s7RNRYqg9A6Mb
STRIPE_AI_CREDITS_20_PLAN_ID=price_1Th91gLlEZ4s7RNRcsOaAuab
STRIPE_AI_CREDITS_50_PLAN_ID=price_1Th92ULlEZ4s7RNRfzOF1bbH
# USD (annual)
STRIPE_CATECHIST_PRO_ANNUAL_PLAN_ID=price_1Th8sFLlEZ4s7RNRGS7lAz5o
STRIPE_CATECHIST_AI_ANNUAL_PLAN_ID=price_1Th8tlLlEZ4s7RNR6OWAQSHR
STRIPE_PARISH_ESSENTIAL_ANNUAL_PLAN_ID=price_1Th8vVLlEZ4s7RNRgMXXX4BZ
STRIPE_PARISH_COMPLETE_ANNUAL_PLAN_ID=price_1Th8wNLlEZ4s7RNRqGI9G4Db
STRIPE_DIOCESE_ANNUAL_PLAN_ID=price_1Th8xALlEZ4s7RNRXgHRyBMs
# BRL (monthly)
STRIPE_CATECHIST_PRO_BRL_PLAN_ID=price_1TiMOpLlEZ4s7RNR6I52HouV
STRIPE_CATECHIST_AI_BRL_PLAN_ID=price_1TiMPaLlEZ4s7RNR6c2PD9Wk
STRIPE_PARISH_ESSENTIAL_BRL_PLAN_ID=price_1TiMQ2LlEZ4s7RNR8AbXDOs3
STRIPE_PARISH_COMPLETE_BRL_PLAN_ID=price_1TiMQSLlEZ4s7RNRkOKz4oOe
STRIPE_DIOCESE_BRL_PLAN_ID=price_1TiMRNLlEZ4s7RNRrHoCujTE
STRIPE_AI_CREDITS_20_BRL_PLAN_ID=price_1TiMS0LlEZ4s7RNR4Q1u9DFK
STRIPE_AI_CREDITS_50_BRL_PLAN_ID=price_1TiMSdLlEZ4s7RNRGJUNhdlz
# BRL (annual)
STRIPE_CATECHIST_PRO_ANNUAL_BRL_PLAN_ID=price_1TiMTgLlEZ4s7RNRWo3DwgkP
STRIPE_CATECHIST_AI_ANNUAL_BRL_PLAN_ID=price_1TiMUGLlEZ4s7RNRHmfCp23z
STRIPE_PARISH_ESSENTIAL_ANNUAL_BRL_PLAN_ID=price_1TiMUiLlEZ4s7RNRbLvE5ikU
STRIPE_PARISH_COMPLETE_ANNUAL_BRL_PLAN_ID=price_1TiMVnLlEZ4s7RNRTivo5zui
STRIPE_DIOCESE_ANNUAL_BRL_PLAN_ID=price_1TiMWMLlEZ4s7RNR0Tau0jQQ
PRICES

echo "✅ Stripe Price IDs appended to $REMOTE_PATH/.env.server on $SSH_HOST"
echo "⚠️  Remember to restart the app after: systemctl restart catequese-viva"
