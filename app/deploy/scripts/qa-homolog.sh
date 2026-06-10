#!/usr/bin/env bash
# Automated homolog smoke checks (complements app/docs/HOMOLOG.md manual QA).
set -euo pipefail

API_URL="${HOMOLOG_API_URL:-https://api-homolog.catechis.app}"
STAFF_URL="${HOMOLOG_STAFF_URL:-https://homolog.catechis.app}"
FAMILY_URL="${HOMOLOG_FAMILY_URL:-https://familia-homolog.catechis.app}"

# Optional: Cloudflare Access service token (see app/docs/CLOUDFLARE_ACCESS.md)
CF_CURL=()
if [[ -n "${CF_ACCESS_CLIENT_ID:-}" && -n "${CF_ACCESS_CLIENT_SECRET:-}" ]]; then
  CF_CURL=(-H "CF-Access-Client-Id: ${CF_ACCESS_CLIENT_ID}" -H "CF-Access-Client-Secret: ${CF_ACCESS_CLIENT_SECRET}")
fi

pass() { echo "✓ $1"; }
fail() { echo "✗ $1"; exit 1; }

echo "=== Homolog automated checks ==="

# Health (in-container if running on VPS)
if [[ -f /opt/catechis/docker-compose.homolog.yml ]]; then
  cd /opt/catechis
  HEALTH=$(docker compose -f docker-compose.homolog.yml exec -T server node -e \
    "fetch('http://127.0.0.1:3001/health').then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))" 2>/dev/null || echo '{}')
  echo "$HEALTH" | grep -q '"status":"ok"' || fail "Health status not ok: $HEALTH"
  echo "$HEALTH" | grep -q '"database":"ok"' || fail "Database not ok"
  echo "$HEALTH" | grep -q '"healthy":true' || fail "Storage not healthy"
  pass "In-container /health"
else
  HEALTH=$(curl -fsS "${CF_CURL[@]}" "${API_URL}/health" 2>/dev/null || echo '{}')
  echo "$HEALTH" | grep -q '"database":"ok"' || echo "⚠ External health check skipped or degraded (TLS/DNS)"
fi

curl -fsS "${CF_CURL[@]}" -o /dev/null "${STAFF_URL}/" && pass "Staff SPA loads" || fail "Staff SPA"
curl -fsS "${CF_CURL[@]}" -o /dev/null "${FAMILY_URL}/" && pass "Family SPA loads" || fail "Family SPA"
curl -fsS "${CF_CURL[@]}" -o /dev/null "${FAMILY_URL}/convite" && pass "Invite code page" || fail "Invite page"

echo ""
echo "Automated checks passed. Complete manual pastoral QA in app/docs/HOMOLOG.md"
