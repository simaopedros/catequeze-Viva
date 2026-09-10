#!/usr/bin/env bash
# Shared toolchain setup for the Catequese Viva Cloud Agent environment.
# Sourced by install.sh and start.sh (and re-exported into ~/.bashrc).
#
# Wasp 0.22's npm-distributed CLI requires Node >= 22.22.2, while the ambient
# toolchain provides an older Node. We therefore pin an nvm-managed Node and a
# user-writable npm global prefix, and put both ahead of everything else.

export NODE_VERSION="22.22.2"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

# nvm refuses to load while NPM_CONFIG_PREFIX is set, and sourcing it under
# `set -e` can abort the caller, so load it defensively with the prefix unset.
__cv_had_e=0
case $- in *e*) __cv_had_e=1 ;; esac
set +e
unset NPM_CONFIG_PREFIX
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  if ! nvm which "$NODE_VERSION" >/dev/null 2>&1; then
    nvm install "$NODE_VERSION" >/dev/null 2>&1
  fi
fi
[ "$__cv_had_e" = 1 ] && set -e
unset __cv_had_e

# Now pin the user npm global prefix and prioritize the pinned toolchain.
export NPM_CONFIG_PREFIX="$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$NVM_DIR/versions/node/v${NODE_VERSION}/bin:$PATH"

# Local dev database connection (managed Postgres started in start.sh).
export DEV_DATABASE_URL="postgresql://wasp:wasp@localhost:5432/catequese_dev"
