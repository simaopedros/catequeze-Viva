import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectCurrency } from '../shared/currency';

function mockNavigatorLanguages(languages: string[]) {
  vi.stubGlobal('navigator', {
    language: languages[0],
    languages,
  });
}

function mockTimeZone(timeZone: string) {
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
    resolvedOptions: () => ({ timeZone }),
  }) as Intl.DateTimeFormat);
}

describe('detectCurrency', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // The platform is Brazil-only and bills exclusively in BRL, so
  // detectCurrency() always returns 'BRL' regardless of locale/timezone.
  it('always returns BRL for Brazil locales', () => {
    mockNavigatorLanguages(['pt-BR', 'pt']);
    mockTimeZone('America/Sao_Paulo');

    expect(detectCurrency()).toBe('BRL');
  });

  it('returns BRL even for non-Brazil locales (platform is BR-only)', () => {
    mockNavigatorLanguages(['pt-PT', 'pt']);
    mockTimeZone('Europe/Lisbon');

    expect(detectCurrency()).toBe('BRL');
  });

  it('returns BRL for any locale/timezone combination', () => {
    mockNavigatorLanguages(['en-US']);
    mockTimeZone('America/New_York');

    expect(detectCurrency()).toBe('BRL');
  });
});
