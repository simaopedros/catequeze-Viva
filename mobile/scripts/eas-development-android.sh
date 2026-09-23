#!/usr/bin/env bash
# Dispara um development build Android na EAS (APK, internal).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "Erro: defina EXPO_TOKEN (https://expo.dev/settings/access-tokens)."
  echo "No Cloud Agent: adicione o secret EXPO_TOKEN nas definições do ambiente do repositório."
  exit 1
fi

npx eas-cli@latest whoami

if ! node -e "const j=require('./app.json'); process.exit(j.expo?.extra?.eas?.projectId ? 0 : 1)"; then
  echo "A associar projeto EAS (slug: catequis)..."
  npx eas-cli@latest init --non-interactive --force
fi

echo "A iniciar build development (Android APK)..."
npx eas-cli@latest build \
  --profile development \
  --platform android \
  --non-interactive \
  --no-wait

echo "Acompanhe em https://expo.dev/accounts/[sua-conta]/projects/catequis/builds"
