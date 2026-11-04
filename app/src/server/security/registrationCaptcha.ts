export type CaptchaResult = 'valid' | 'invalid' | 'unavailable';
export interface RegistrationCaptchaVerifier {
  verify(token: string): Promise<CaptchaResult>;
}

export function createTurnstileVerifier(secret: string | undefined, fetcher: typeof fetch = fetch): RegistrationCaptchaVerifier {
  return {
    async verify(token) {
      if (!secret) return 'unavailable';
      if (!token) return 'invalid';
      try {
        const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, response: token }),
          signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) return 'unavailable';
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || typeof (data as { success?: unknown }).success !== 'boolean') return 'unavailable';
        return (data as { success: boolean }).success ? 'valid' : 'invalid';
      } catch { return 'unavailable'; }
    },
  };
}
