#!/usr/bin/env bash
# Runner self-hosted da GitHub Actions (não gasta minutos ubuntu-latest).
# Instalar na VPS de homolog — NÃO na de produção.
#
# 1. No GitHub: Settings → Actions → Runners → New self-hosted runner
#    https://github.com/simaopedros/catequeze-Viva/settings/actions/runners/new
# 2. Copiar o token e, na VPS homolog:
#      sudo GITHUB_RUNNER_TOKEN=XXXX ./install-github-runner.sh
set -euo pipefail

REPO_URL="${GITHUB_REPO_URL:-https://github.com/simaopedros/catequeze-Viva}"
INSTALL_DIR="${GITHUB_RUNNER_DIR:-/opt/catechis/actions-runner}"
TOKEN="${GITHUB_RUNNER_TOKEN:-}"
LABELS="${GITHUB_RUNNER_LABELS:-self-hosted,linux,catequese-ci}"

if [[ -z "$TOKEN" ]]; then
  echo "Defina GITHUB_RUNNER_TOKEN (Settings → Actions → Runners → New runner)."
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Corra com sudo."
  exit 1
fi

command -v curl >/dev/null
command -v tar >/dev/null
command -v docker >/dev/null || echo "Aviso: Docker não encontrado; testes de integração precisam dele."

echo "Disco:"
df -h / | tail -1
avail_kb="$(df -k --output=avail / | tail -1 | tr -d ' ')"
if [[ "${avail_kb:-0}" -lt 8388608 ]]; then
  echo "Aviso: menos de 8 GB livres. O docker build do CI/deploy pode falhar."
fi

id -u github-runner >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/catechis/github-runner-home --shell /bin/bash github-runner
usermod -aG docker github-runner 2>/dev/null || true

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [[ ! -x ./run.sh ]]; then
  latest="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | grep -oP '"tag_name":\s*"v\K[0-9.]+' | head -1)"
  if [[ -z "$latest" ]]; then
    echo "Não consegui obter a versão do runner."
    exit 1
  fi
  pkg="actions-runner-linux-x64-${latest}.tar.gz"
  curl -fsSL -o "$pkg" "https://github.com/actions/runner/releases/download/v${latest}/${pkg}"
  tar xzf "$pkg"
  rm -f "$pkg"
fi

chown -R github-runner:github-runner "$INSTALL_DIR"

sudo -u github-runner ./config.sh --unattended --url "$REPO_URL" --token "$TOKEN" \
  --name "${GITHUB_RUNNER_NAME:-catequese-homolog}" \
  --labels "$LABELS" \
  --replace

./svc.sh install github-runner
./svc.sh start

echo "Runner ativo. Confirme em Settings → Actions → Runners."
echo "Os workflows usam runs-on: self-hosted."
