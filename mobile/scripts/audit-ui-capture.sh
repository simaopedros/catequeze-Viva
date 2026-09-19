#!/usr/bin/env bash
# Captura screenshots de auditoria UI (Expo web, viewport móvel).
set -euo pipefail
cd "$(dirname "$0)/../../app"
node scripts/mobile-ui-audit-capture.mjs "$@"
