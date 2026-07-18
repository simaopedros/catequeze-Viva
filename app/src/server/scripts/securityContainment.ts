/**
 * One-shot security containment helpers (read/write).
 *
 * Usage:
 *   npx tsx src/server/scripts/securityContainment.ts revoke-upload-tokens
 *   npx tsx src/server/scripts/securityContainment.ts encrypt-totp-secrets
 *   npx tsx src/server/scripts/securityContainment.ts audit-privileged-roles
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function loadKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('TOTP_ENCRYPTION_KEY required in production');
    }
    return crypto.createHash('sha256').update('dev-totp-key-not-for-prod').digest();
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('TOTP_ENCRYPTION_KEY must be 32 bytes');
  return key;
}

function encrypt(plaintext: string): string {
  const key = loadKey();
  const version = process.env.TOTP_ENCRYPTION_KEY_VERSION?.trim() || '1';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    'enc',
    'v1',
    version,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

async function revokeUploadTokens() {
  const result = await prisma.catechumenProfile.updateMany({
    where: { uploadToken: { not: null } },
    data: { uploadToken: null, uploadTokenExpires: null },
  });
  console.log(JSON.stringify({ operation: 'revoke-upload-tokens', revoked: result.count }));
}

async function encryptTotpSecrets() {
  const rows = await prisma.userTwoFactor.findMany({
    select: { id: true, userId: true, secret: true },
  });
  let encrypted = 0;
  let skipped = 0;
  for (const row of rows) {
    if (row.secret.startsWith('enc:v1:')) {
      skipped++;
      continue;
    }
    await prisma.userTwoFactor.update({
      where: { id: row.id },
      data: { secret: encrypt(row.secret) },
    });
    encrypted++;
  }
  console.log(
    JSON.stringify({
      operation: 'encrypt-totp-secrets',
      encrypted,
      skippedAlreadyEncrypted: skipped,
      total: rows.length,
    }),
  );
}

async function auditPrivilegedRoles() {
  const memberships = await prisma.membership.findMany({
    where: {
      status: 'ACTIVE',
      role: { in: ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR'] },
    },
    select: { id: true, userId: true, parishId: true, role: true, createdAt: true },
    take: 5000,
  });
  const byUser = new Map<string, { parishId: string; role: string }[]>();
  for (const m of memberships) {
    const list = byUser.get(m.userId) || [];
    list.push({ parishId: m.parishId, role: m.role });
    byUser.set(m.userId, list);
  }
  const multi = [...byUser.entries()]
    .filter(([, roles]) => roles.length > 1)
    .map(([userId, roles]) => ({ userId, roles }));

  console.log(
    JSON.stringify({
      operation: 'audit-privileged-roles',
      privilegedMemberships: memberships.length,
      multiWorkspacePrivilegedUsers: multi.length,
      sample: multi.slice(0, 50),
    }),
  );
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'revoke-upload-tokens') await revokeUploadTokens();
  else if (cmd === 'encrypt-totp-secrets') await encryptTotpSecrets();
  else if (cmd === 'audit-privileged-roles') await auditPrivilegedRoles();
  else {
    console.error(
      'Usage: securityContainment.ts <revoke-upload-tokens|encrypt-totp-secrets|audit-privileged-roles>',
    );
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
