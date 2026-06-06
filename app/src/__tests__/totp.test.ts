/**
 * Unit tests for TOTP (2FA) implementation.
 */
import { describe, it, expect } from 'vitest';
import { generateSecret, generateTotp, verifyTotp, getOtpauthUri } from '../server/auth/totp';

describe('TOTP 2FA', () => {
  describe('generateSecret', () => {
    it('generates a base32 secret', () => {
      const secret = generateSecret();
      expect(secret).toBeTruthy();
      expect(secret.length).toBeGreaterThanOrEqual(16);
      // Base32 characters only
      expect(/^[A-Z2-7]+=*$/.test(secret)).toBe(true);
    });

    it('generates unique secrets', () => {
      const s1 = generateSecret();
      const s2 = generateSecret();
      expect(s1).not.toBe(s2);
    });
  });

  describe('generateTotp + verifyTotp', () => {
    it('generates and verifies a valid TOTP code', () => {
      const secret = generateSecret();
      const code = generateTotp(secret);
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
      expect(verifyTotp(secret, code)).toBe(true);
    });

    it('rejects invalid codes', () => {
      const secret = generateSecret();
      expect(verifyTotp(secret, '000000')).toBe(false);
      expect(verifyTotp(secret, 'abc123')).toBe(false);
    });

    it('rejects empty/wrong length codes', () => {
      const secret = generateSecret();
      expect(verifyTotp(secret, '12345')).toBe(false);
      expect(verifyTotp(secret, '1234567')).toBe(false);
    });
  });

  describe('getOtpauthUri', () => {
    it('generates a valid otpauth URI', () => {
      const uri = getOtpauthUri('JBSWY3DPEHPK3PXP', 'test@example.com');
      expect(uri.startsWith('otpauth://totp/')).toBe(true);
      expect(uri).toContain('test%40example.com');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('algorithm=SHA1');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });
  });
});
