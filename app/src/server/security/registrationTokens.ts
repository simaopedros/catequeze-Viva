import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function generateRegistrationProtocol(): string {
  const bytes = randomBytes(12);
  return Array.from(bytes, byte => alphabet[byte & 31]).join('');
}
export function generateRegistrationAccessToken(): string { return randomBytes(32).toString('base64url'); }
export function hashRegistrationAccessToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }
function signingKey(secret: string): Buffer {
  if (!secret) throw new Error('Segredo indisponível');
  return createHmac('sha256', secret).update('registration-form-token-v1').digest();
}
export function createRegistrationFormToken(campaignId: string, secret: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ campaignId, issuedAt: now, nonce: randomBytes(16).toString('base64url') })).toString('base64url');
  return `${body}.${createHmac('sha256', signingKey(secret)).update(body).digest('base64url')}`;
}
export function verifyRegistrationFormToken(token: string, campaignId: string, secret: string, now = Date.now()): boolean {
  if (!secret || !token || token.length > 2048) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const signature = Buffer.from(parts[1]);
  const expected = Buffer.from(createHmac('sha256', signingKey(secret)).update(parts[0]).digest('base64url'));
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const age = now - payload.issuedAt;
    return payload.campaignId === campaignId && typeof payload.nonce === 'string' && Number.isSafeInteger(payload.issuedAt) && age >= 8000 && age <= 7200000;
  } catch { return false; }
}
