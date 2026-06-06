#!/bin/bash
# fix-auth.sh — Recreates Auth tables dropped by Wasp DB sync
# Run this after `wasp start` if login fails with 500

cd "$(dirname "$0")"

node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function fix() {
  await p.\$executeRawUnsafe('CREATE TABLE IF NOT EXISTS \"Auth\" (id TEXT PRIMARY KEY, \"userId\" TEXT UNIQUE, CONSTRAINT \"Auth_userId_fkey\" FOREIGN KEY (\"userId\") REFERENCES \"User\"(id) ON DELETE CASCADE ON UPDATE CASCADE)');
  await p.\$executeRawUnsafe(\"CREATE TABLE IF NOT EXISTS \\\"AuthIdentity\\\" (\\\"providerName\\\" TEXT NOT NULL, \\\"providerUserId\\\" TEXT NOT NULL, \\\"providerData\\\" TEXT NOT NULL DEFAULT '{}', \\\"authId\\\" TEXT NOT NULL, PRIMARY KEY (\\\"providerName\\\", \\\"providerUserId\\\"), CONSTRAINT \\\"AuthIdentity_authId_fkey\\\" FOREIGN KEY (\\\"authId\\\") REFERENCES \\\"Auth\\\"(id) ON DELETE CASCADE ON UPDATE CASCADE)\");
  await p.\$executeRawUnsafe('CREATE TABLE IF NOT EXISTS \"Session\" (id TEXT PRIMARY KEY, \"expiresAt\" TIMESTAMP(3) NOT NULL, \"userId\" TEXT NOT NULL, CONSTRAINT \"Session_userId_fkey\" FOREIGN KEY (\"userId\") REFERENCES \"Auth\"(id) ON DELETE CASCADE ON UPDATE CASCADE)');
  console.log('✅ Auth tables fixed');
  await p.\$disconnect();
}
fix().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1
