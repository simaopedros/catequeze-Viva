#!/usr/bin/env bash
# Post-provision SSH hardening — run once per VPS after key-based auth works.
# Usage: sudo ./harden-ssh.sh
set -euo pipefail

SSHD="/etc/ssh/sshd_config"

if ! grep -q "^PasswordAuthentication no" "$SSHD" 2>/dev/null; then
  echo "PasswordAuthentication no" >> "$SSHD"
fi

if ! grep -q "^PermitRootLogin prohibit-password" "$SSHD" 2>/dev/null; then
  echo "PermitRootLogin prohibit-password" >> "$SSHD"
fi

systemctl reload sshd || systemctl reload ssh

echo "SSH hardened. Ensure your public key works before closing this session."
echo "Rotate Neon DATABASE_URL password and VPS root password if they were shared."
