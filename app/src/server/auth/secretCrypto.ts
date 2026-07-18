/**
 * AES-256-GCM helpers for at-rest secrets (TOTP).
 *
 * Envelope format: enc:v1:<keyVersion>:<iv_b64>:<tag_b64>:<cipher_b64>
 * Plaintext legacy values are still accepted until re-encrypted.
 *
 * Key material: env TOTP_ENCRYPTION_KEY (32-byte hex or base64) and optional
 * TOTP_ENCRYPTION_KEY_VERSION (default "1").
 */
import crypto from 'node:crypto';
import { HttpError } from 'wasp/server';

const PREFIX = 'enc:v1:';

function loadKeyMaterial(): { key: Buffer; version: string } {
  const raw = process.env.TOTP_ENCRYPTION_KEY?.trim();
  const version = process.env.TOTP_ENCRYPTION_KEY_VERSION?.trim() || '1';
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpError(
        500,
        'TOTP_ENCRYPTION_KEY não configurada. Configure a chave antes de usar 2FA em produção.',
      );
    }
    // Deterministic dev-only fallback (not for production)
    const key = crypto.createHash('sha256').update('dev-totp-key-not-for-prod').digest();
    return { key, version: 'dev' };
  }

  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    key = Buffer.from(raw, 'base64');
  }
  if (key.length !== 32) {
    throw new HttpError(
      500,
      'TOTP_ENCRYPTION_KEY deve ter 32 bytes (hex de 64 chars ou base64).',
    );
  }
  return { key, version };
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptSecret(plaintext: string): string {
  const { key, version } = loadKeyMaterial();
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

export function decryptSecret(value: string): string {
  if (!isEncryptedSecret(value)) {
    // Legacy plaintext — still accepted
    return value;
  }
  const parts = value.split(':');
  // enc:v1:version:iv:tag:cipher
  if (parts.length !== 6 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new HttpError(500, 'Formato de segredo TOTP inválido.');
  }
  const [, , , ivB64, tagB64, cipherB64] = parts;
  const { key } = loadKeyMaterial();
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(cipherB64, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString('utf8');
}

/** Encrypt if still plaintext; return as-is if already encrypted. */
export function ensureEncryptedSecret(value: string): string {
  if (isEncryptedSecret(value)) return value;
  return encryptSecret(value);
}
