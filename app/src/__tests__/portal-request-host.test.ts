/**
 * Host detection helpers for family portal request scoping.
 */
import { describe, it, expect } from 'vitest';
import {
  hostFromRequest,
  isFamilyPortalHost,
  isFamilyPortalRequest,
} from '../shared/portal';

describe('hostFromRequest / isFamilyPortalRequest', () => {
  it('reads x-forwarded-host before host', () => {
    expect(
      hostFromRequest({
        headers: {
          'x-forwarded-host': 'familia.catechis.app',
          host: 'internal:3000',
        },
      }),
    ).toBe('familia.catechis.app');
  });

  it('strips port and takes first proxy hop', () => {
    expect(
      hostFromRequest({
        headers: { host: 'familia-homolog.catechis.app:443, proxy' },
      }),
    ).toBe('familia-homolog.catechis.app');
  });

  it('detects family portal on context.req', () => {
    expect(
      isFamilyPortalRequest({
        req: { headers: { 'x-forwarded-host': 'familia.catechis.app' } },
      }),
    ).toBe(true);
    expect(
      isFamilyPortalRequest({
        request: { headers: { host: 'catechis.app' } },
      }),
    ).toBe(false);
  });

  it('isFamilyPortalHost still matches familia- prefix', () => {
    expect(isFamilyPortalHost('familia-qa.example.com')).toBe(true);
  });
});
