import { describe, expect, it } from 'vitest';
import {
  buildCatechismHref,
  buildDirectoryHref,
  buildDocumentHref,
  buildVerseHref,
  excerptFromHtml,
  isSocialShareKind,
  sanitizeShareText,
} from '../shared/socialShare';
import { validateSocialPostDraft } from '../server/operations/socialPolicies';

describe('social share snapshots', () => {
  it('recognises native share kinds only', () => {
    expect(isSocialShareKind('VERSE')).toBe(true);
    expect(isSocialShareKind('CATECHISM')).toBe(true);
    expect(isSocialShareKind('DIRECTORY')).toBe(true);
    expect(isSocialShareKind('DOCUMENT')).toBe(true);
    expect(isSocialShareKind('AI_ARTIFACT')).toBe(true);
    expect(isSocialShareKind('TEXT')).toBe(false);
    expect(isSocialShareKind('')).toBe(false);
  });

  it('strips markup and caps excerpt length', () => {
    expect(sanitizeShareText('<p>Paz  e   <b>bem</b></p>', 80)).toBe('Paz e bem');
    expect(sanitizeShareText('a'.repeat(50), 20)).toBe(`${'a'.repeat(19)}…`);
  });

  it('extracts a readable excerpt from HTML documents', () => {
    expect(excerptFromHtml('<h1>Batismo</h1><p>A água  é sinal.</p>', 80)).toBe(
      'Batismo A água é sinal.',
    );
  });

  it('builds deep-links back to the origin surface', () => {
    expect(buildVerseHref('book-1', 3, 16)).toBe('/app/bible?book=book-1&chapter=3&verse=16');
    expect(buildCatechismHref(1210)).toBe('/app/catechism?entry=1210');
    expect(buildDocumentHref('doc-9')).toBe('/app/content-library/doc-9');
    expect(buildDirectoryHref(42)).toBe('/app/directory?entry=42');
  });
});

describe('validateSocialPostDraft with native share', () => {
  it('accepts a share-only draft without body or media', () => {
    expect(
      validateSocialPostDraft({
        body: '',
        mediaCount: 0,
        mediaConsentAck: false,
        hasShare: true,
      }),
    ).toBeNull();
  });

  it('still requires text, media or a share', () => {
    expect(
      validateSocialPostDraft({
        body: '   ',
        mediaCount: 0,
        mediaConsentAck: false,
        hasShare: false,
      }),
    ).toMatch(/Escreva algo/);
  });
});
