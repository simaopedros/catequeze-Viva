#!/usr/bin/env bash
# Importa .env.server para Fly secrets (não commitar o .env).
# Uso:
#   ./deploy/scripts/fly-secrets.sh homolog /path/to/.env.server
#   ./deploy/scripts/fly-secrets.sh prod    /path/to/.env.server
set -euo pipefail

ENV="${1:-}"
ENVFILE="${2:-}"

if [[ -z "$ENV" || -z "$ENVFILE" || ! -f "$ENVFILE" ]]; then
  echo "Uso: $0 homolog|prod <ficheiro.env.server>"
  echo "O ficheiro deve existir só na tua máquina / VPS — nunca no git."
  exit 1
fi

case "$ENV" in
  homolog) APP="catechis-api-homolog" ;;
  prod|production) APP="catechis-api" ;;
  *) echo "Ambiente inválido: $ENV"; exit 1 ;;
esac

# Chaves que o boot Wasp exige. O resto do .env também é importado.
REQUIRED=(
  DATABASE_URL
  JWT_SECRET
  STRIPE_API_KEY
  STRIPE_WEBHOOK_SECRET
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  MAINTENANCE_SECRET
  SMTP_PASSWORD
  RESEND_API_KEY
)

missing=()
for key in "${REQUIRED[@]}"; do
  if ! grep -qE "^${key}=" "$ENVFILE"; then
    missing+=("$key")
  fi
done
if ((${#missing[@]})); then
  echo "Faltam chaves em $ENVFILE: ${missing[*]}"
  exit 1
fi

# fly secrets import ignora linhas vazias e comentários.
# Não reenvia WASP_* / PORT / RUN_JOBS — esses estão no fly.toml [env].
FILTERED="$(mktemp)"
trap 'rm -f "$FILTERED"' EXIT
grep -E '^[A-Z0-9_]+=' "$ENVFILE" \
  | grep -vE '^(PORT|NODE_ENV|RUN_JOBS|WASP_WEB_CLIENT_URL|WASP_SERVER_URL|COOKIE_DOMAIN|FAMILY_PORTAL_HOST|STAFF_PORTAL_HOST|PRICING_CATALOG_SOURCE|SENTRY_ENVIRONMENT|SMTP_HOST|SMTP_PORT|SMTP_USERNAME|EMAIL_FROM_|POLAR_SANDBOX_MODE|PAYMENTS_|LEMONSQUEEZY_|POLAR_ORGANIZATION|POLAR_WEBHOOK)=' \
  > "$FILTERED"

echo "A importar secrets para $APP (sem valores no stdout)..."
fly secrets import --app "$APP" < "$FILTERED"
echo "OK. Confirma com: fly secrets list --app $APP"
echo "Não listes valores. Roda: fly status --app $APP"
