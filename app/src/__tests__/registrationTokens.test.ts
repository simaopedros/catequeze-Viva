import { describe, expect, it } from 'vitest';
import { createRegistrationFormToken, generateRegistrationAccessToken, generateRegistrationProtocol, hashRegistrationAccessToken, verifyRegistrationFormToken } from '../server/security/registrationTokens';

describe('tokens de inscrição', () => {
  it('gera protocolos e tokens aleatórios, armazenando apenas o hash', () => {
    const token = generateRegistrationAccessToken();
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    expect(hashRegistrationAccessToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(generateRegistrationProtocol()).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/);
    expect(generateRegistrationProtocol()).not.toBe(generateRegistrationProtocol());
  });
  it('exige assinatura, campanha e tempo válidos', () => {
    const token = createRegistrationFormToken('campaign', 'secret', 100000);
    expect(verifyRegistrationFormToken(token, 'campaign', 'secret', 108000)).toBe(true);
    expect(verifyRegistrationFormToken(token, 'campaign', 'secret', 107999)).toBe(false);
    expect(verifyRegistrationFormToken(token, 'campaign', 'secret', 7300001)).toBe(false);
    expect(verifyRegistrationFormToken(token, 'other', 'secret', 108000)).toBe(false);
    expect(verifyRegistrationFormToken(token + 'x', 'campaign', 'secret', 108000)).toBe(false);
    expect(verifyRegistrationFormToken(token, 'campaign', '', 108000)).toBe(false);
  });
});
