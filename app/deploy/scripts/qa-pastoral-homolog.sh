#!/usr/bin/env bash
# QA pastoral automated checks (extends qa-homolog.sh). See app/docs/HOMOLOG.md.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Phase 1: base smoke (qa-homolog.sh) ==="
bash "${SCRIPT_DIR}/qa-homolog.sh"

API_URL="${HOMOLOG_API_URL:-https://api-homolog.catechis.app}"
STAFF_URL="${HOMOLOG_STAFF_URL:-https://homolog.catechis.app}"
FAMILY_URL="${HOMOLOG_FAMILY_URL:-https://familia-homolog.catechis.app}"

CF_CURL=()
if [[ -n "${CF_ACCESS_CLIENT_ID:-}" && -n "${CF_ACCESS_CLIENT_SECRET:-}" ]]; then
  CF_CURL=(-H "CF-Access-Client-Id: ${CF_ACCESS_CLIENT_ID}" -H "CF-Access-Client-Secret: ${CF_ACCESS_CLIENT_SECRET}")
fi

pass() { echo "✓ $1"; }
fail() { echo "✗ $1"; exit 1; }

echo ""
echo "=== Phase 2: QA pastoral extended checks ==="

WEBHOOK_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
  "${API_URL}/payments-webhook" -H "Content-Type: application/json" -d '{}' || echo "000")
if [[ "${WEBHOOK_CODE}" == "400" || "${WEBHOOK_CODE}" == "401" ]]; then
  pass "Stripe webhook reachable (HTTP ${WEBHOOK_CODE})"
else
  echo "⚠ Stripe webhook HTTP ${WEBHOOK_CODE} (expected 400/401)"
fi

for path in "/entrar" "/criar-conta" "/convite"; do
  curl -fsS "${CF_CURL[@]}" -o /dev/null "${FAMILY_URL}${path}" && pass "Family ${path}" || fail "Family ${path}"
done

if [[ ${#CF_CURL[@]} -gt 0 ]]; then
  curl -fsS "${CF_CURL[@]}" -o /dev/null "${STAFF_URL}/pricing" && pass "Staff /pricing" || echo "⚠ Staff /pricing"
  curl -fsS "${CF_CURL[@]}" -o /dev/null "${STAFF_URL}/login" && pass "Staff /login" || echo "⚠ Staff /login"
else
  echo "⚠ Set CF_ACCESS_CLIENT_ID/SECRET for staff routes behind Cloudflare Access"
fi

if [[ -f /opt/catechis/docker-compose.homolog.yml ]]; then
  cd /opt/catechis
  WORKER_HEALTH=$(docker compose -f docker-compose.homolog.yml exec -T worker node -e \
    "fetch('http://127.0.0.1:3001/health').then(r=>r.json()).then(j=>console.log(j.jobs||'unknown'))" 2>/dev/null || echo "unknown")
  [[ "${WORKER_HEALTH}" == *worker* ]] && pass "Worker health jobs=${WORKER_HEALTH}" || echo "⚠ Worker jobs: ${WORKER_HEALTH}"
  docker compose -f docker-compose.homolog.yml logs --tail=30 worker 2>/dev/null | grep -qE 'remindersJob|subscriptionExpirationJob|sendInviteEmailJob' \
    && pass "Worker logs mention pastoral jobs" || echo "⚠ No recent job log lines (cron may not have fired yet)"
fi

echo ""
echo "Automated pastoral checks done. Complete manual items in app/docs/HOMOLOG.md."
