/**
 * TOTP (Time-based One-Time Password) implementation using Node.js crypto.
 * RFC 6238 compliant. No external dependencies required.
 */
import crypto from 'crypto';

const DIGITS = 6;
const PERIOD = 30; // seconds
const ALGORITHM = 'sha1';

/**
 * Generate a new TOTP secret (base32 encoded).
 */
export function generateSecret(): string {
  const bytes = crypto.randomBytes(20); // 160 bits
  return base32Encode(bytes);
}

/**
 * Generate a TOTP code for the given secret at the current time step.
 */
export function generateTotp(secret: string): string {
  const counter = Math.floor(Date.now() / 1000 / PERIOD);
  return generateHotp(secret, counter);
}

/**
 * Verify a TOTP code (accepts current and previous time step for clock skew).
 */
export function verifyTotp(secret: string, token: string): boolean {
  const counter = Math.floor(Date.now() / 1000 / PERIOD);
  // Check current and previous time step (±1 window for clock skew)
  for (let offset = -1; offset <= 1; offset++) {
    if (generateHotp(secret, counter + offset) === token) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a HOTP code (counter-based).
 */
function generateHotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac(ALGORITHM, key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Get the otpauth URI for QR code generation.
 */
export function getOtpauthUri(secret: string, email: string, issuer = 'CatequeseViva'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

// ─── Base32 encoding (RFC 4648) ────────────────────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Buffer {
  const sanitized = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < sanitized.length; i++) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(sanitized[i]);
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}
