import { describe, it, expect } from 'vitest';
import { rewriteClientLinkForFamilyPortal } from '../auth/emailLinkUtils';

describe('rewriteClientLinkForFamilyPortal', () => {
  it('rewrites staff host to family portal host', () => {
    const link =
      'https://homolog.catechis.app/email-verification?token=abc123';
    expect(
      rewriteClientLinkForFamilyPortal(link, 'familia.homolog.catechis.app'),
    ).toBe(
      'https://familia.homolog.catechis.app/email-verification?token=abc123',
    );
  });

  it('returns null when family host is missing', () => {
    expect(
      rewriteClientLinkForFamilyPortal('https://catechis.app/reset?token=x', undefined),
    ).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(rewriteClientLinkForFamilyPortal('not-a-url', 'familia.catechis.app')).toBeNull();
  });
});
