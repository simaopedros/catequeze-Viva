#!/usr/bin/env bash
# Idempotent install/bootstrap for the Catequese Viva Cloud Agent environment.
#
# Runs after the repository is checked out. Prepares system packages, the Wasp
# toolchain, project dependencies, local env files, the database, and applies
# committed migrations. Safe to run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$REPO_ROOT/app"

# ── 1. System packages (PostgreSQL) ─────────────────────────────────────────
if ! command -v psql >/dev/null 2>&1; then
  echo "[install] Installing PostgreSQL..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql postgresql-contrib
fi

# ── 2. Toolchain: pinned Node + user npm prefix ─────────────────────────────
# shellcheck disable=SC1091
source "$REPO_ROOT/.cursor/setup-path.sh"

# Silence nvm's warning about a globalconfig/prefix in ~/.npmrc.
if [ -f "$HOME/.npmrc" ]; then
  sed -i '/^prefix=/d; /^globalconfig=/d' "$HOME/.npmrc" || true
fi

# ── 3. Wasp CLI (npm-distributed, pinned) ───────────────────────────────────
if ! wasp version >/dev/null 2>&1; then
  echo "[install] Installing Wasp CLI 0.22.0..."
  npm install -g @wasp.sh/wasp-cli@0.22.0 @wasp.sh/wasp-cli-linux-x64-glibc@0.22.0
fi

# ── 4. Persist toolchain PATH for interactive/login shells ──────────────────
BASHRC="$HOME/.bashrc"
MARKER="# === catequese-viva cloud-agent env ==="
if ! grep -qF "$MARKER" "$BASHRC" 2>/dev/null; then
  {
    echo ""
    echo "$MARKER"
    echo "source \"$REPO_ROOT/.cursor/setup-path.sh\""
  } >> "$BASHRC"
fi

# ── 5. Project dependencies ─────────────────────────────────────────────────
cd "$APP_DIR"
echo "[install] npm ci..."
npm ci

# ── 6. Patch Wasp's server rollup template (single-file bundle fix) ─────────
node scripts/patch-wasp-rollup.cjs || true

# ── 7. Local env files (dev placeholders; gitignored) ───────────────────────
if [ ! -f "$APP_DIR/.env.server" ]; then
  echo "[install] Writing app/.env.server ..."
  cat > "$APP_DIR/.env.server" <<'ENVSERVER'
DATABASE_URL=postgresql://wasp:wasp@localhost:5432/catequese_dev
JWT_SECRET=dev-jwt-secret-change-me-0123456789abcdef0123456789abcdef
WASP_WEB_CLIENT_URL=http://localhost:3000
WASP_SERVER_URL=http://localhost:3001
SKIP_EMAIL_VERIFICATION_IN_DEV=true
EMAIL_PROVIDER=fake
ADMIN_EMAILS=admin@catechis.app
STRIPE_API_KEY=sk_test_dev
STRIPE_WEBHOOK_SECRET=whsec_dev
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USERNAME=dev
SMTP_PASSWORD=dev
GOOGLE_CLIENT_ID=dev-google-client-id
GOOGLE_CLIENT_SECRET=dev-google-client-secret
PRICING_CATALOG_SOURCE=db
ENVSERVER
fi

if [ ! -f "$APP_DIR/.env.client" ]; then
  echo "[install] Writing app/.env.client ..."
  cat > "$APP_DIR/.env.client" <<'ENVCLIENT'
REACT_APP_FAMILY_PORTAL_HOST=familia.localhost
REACT_APP_STAFF_PORTAL_HOST=localhost
ENVCLIENT
fi

# ── 8. Database: start Postgres, ensure role + database ─────────────────────
sudo pg_ctlcluster 16 main start 2>/dev/null || true
for _ in $(seq 1 15); do
  pg_isready -h localhost -q && break || sleep 1
done
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='wasp'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE wasp WITH LOGIN PASSWORD 'wasp' CREATEDB SUPERUSER;"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='catequese_dev'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE catequese_dev OWNER wasp;"

# ── 9. Compile Wasp project (generates .wasp/out; read-only on the DB) ───────
echo "[install] Compiling Wasp project..."
DATABASE_URL="$DEV_DATABASE_URL" wasp compile
node scripts/patch-wasp-rollup.cjs || true

# ── 10. Apply committed migrations to a clean, migration-tracked database ────
# `prisma migrate deploy` (using Wasp's generated schema, which includes the
# internal Auth/Session tables) applies the committed migrations exactly and
# records them in `_prisma_migrations` — the same command Wasp runs on deploy.
# It only succeeds on an empty DB or one that already has migration history, so
# recreate the dev DB when no history is present (fresh, or a db-push'd state).
HAS_HISTORY=$(PGPASSWORD=wasp psql -h localhost -U wasp -d catequese_dev -tAc \
  "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;" 2>/dev/null || echo "")
if [ "$HAS_HISTORY" != "t" ]; then
  echo "[install] No migration history — recreating clean dev database..."
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS catequese_dev;"
  sudo -u postgres psql -c "CREATE DATABASE catequese_dev OWNER wasp;"
fi

echo "[install] Applying committed migrations (prisma migrate deploy)..."
DATABASE_URL="$DEV_DATABASE_URL" node node_modules/.bin/prisma migrate deploy \
  --schema .wasp/out/db/schema.prisma

# ── 11. Seed demo data if the database has no users yet ─────────────────────
USER_COUNT=$(PGPASSWORD=wasp psql -h localhost -U wasp -d catequese_dev -tAc \
  'SELECT count(*) FROM "User";' 2>/dev/null || echo 0)
if [ "${USER_COUNT:-0}" = "0" ]; then
  echo "[install] Seeding demo data (users, parishes, classes)..."
  DATABASE_URL="$DEV_DATABASE_URL" NODE_ENV=development \
    SKIP_EMAIL_VERIFICATION_IN_DEV=true JWT_SECRET=dev-jwt-secret \
    WASP_SERVER_URL=http://localhost:3001 WASP_WEB_CLIENT_URL=http://localhost:3000 \
    node seed_test_data.js || true
fi

echo "[install] Done."
