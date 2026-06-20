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

  it('uses BRL for Brazil locales', () => {
    mockNavigatorLanguages(['pt-BR', 'pt']);
    mockTimeZone('Europe/Lisbon');

    expect(detectCurrency()).toBe('BRL');
  });

  it('does not treat every Portuguese locale as Brazil', () => {
    mockNavigatorLanguages(['pt-PT', 'pt']);
    mockTimeZone('Europe/Lisbon');

    expect(detectCurrency()).toBe('USD');
  });

  it('uses BRL for Brazilian time zones even with a non-Brazil locale', () => {
    mockNavigatorLanguages(['en-US']);
    mockTimeZone('America/Sao_Paulo');

    expect(detectCurrency()).toBe('BRL');
  });
});
