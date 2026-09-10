#!/usr/bin/env bash
# CI local — mesma porta que o job "Unit + i18n" da GitHub, sem minutos hosted.
# Uso (na pasta app/): ./scripts/ci.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> npm ci"
npm ci

echo "==> i18n:check"
npm run i18n:check

echo "==> test:unit"
npm run test:unit

echo "==> test:ui"
npm run test:ui

echo "CI local ok."
