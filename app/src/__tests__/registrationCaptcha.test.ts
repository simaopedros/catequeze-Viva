import { describe, expect, it, vi } from 'vitest';
import { createTurnstileVerifier } from '../server/security/registrationCaptcha';

describe('verificador de CAPTCHA', () => {
  it('falha fechado sem segredo e não chama o provedor', async () => {
    const fetcher = vi.fn();
    expect(await createTurnstileVerifier(undefined, fetcher).verify('token')).toBe('unavailable');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('distingue resposta inválida de falha do provedor', async () => {
    const fake = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) });
    expect(await createTurnstileVerifier('synthetic', fake).verify('token')).toBe('invalid');
    fake.mockRejectedValue(new Error('offline'));
    expect(await createTurnstileVerifier('synthetic', fake).verify('token')).toBe('unavailable');
    fake.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    expect(await createTurnstileVerifier('synthetic', fake).verify('token')).toBe('valid');
  });
});
