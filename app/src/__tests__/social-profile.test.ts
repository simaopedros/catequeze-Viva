import { describe, expect, it } from 'vitest';
import {
  HANDLE_MAX,
  isValidWebsiteUrl,
  normalizeHandle,
  profilePath,
  sanitizeBio,
  validateHandle,
} from '../shared/socialProfile';
import {
  collectHiddenAuthorIds,
  shouldExcludeAuthorFromFeed,
} from '../shared/socialBlock';

describe('social handle', () => {
  it('normalises @ prefix and case', () => {
    expect(normalizeHandle('  @Maria_Catequista ')).toBe('maria_catequista');
  });

  it('accepts a valid handle', () => {
    expect(validateHandle('maria_catequista')).toBeNull();
    expect(validateHandle('@joao3')).toBeNull();
  });

  it('rejects reserved, short, and invalid handles', () => {
    expect(validateHandle('admin')).toMatch(/não está disponível/);
    expect(validateHandle('ab')).toMatch(/pelo menos/);
    expect(validateHandle('1maria')).toMatch(/letras minúsculas/);
    expect(validateHandle('Maria Catequista')).toMatch(/letras minúsculas/);
    expect(validateHandle('a'.repeat(HANDLE_MAX + 1))).toMatch(/no máximo/);
  });

  it('builds the public profile path', () => {
    expect(profilePath('Maria_Catequista')).toBe('/u/maria_catequista');
  });
});

describe('profile fields', () => {
  it('sanitises bio markup and length', () => {
    expect(sanitizeBio('<b>Catequista</b>\n\n\nparoquial')).toBe('Catequista\n\nparoquial');
    expect(sanitizeBio('x'.repeat(400)).length).toBe(280);
  });

  it('accepts http(s) websites only', () => {
    expect(isValidWebsiteUrl('')).toBe(true);
    expect(isValidWebsiteUrl('https://paroquia.org')).toBe(true);
    expect(isValidWebsiteUrl('http://localhost:3000')).toBe(true);
    expect(isValidWebsiteUrl('javascript:alert(1)')).toBe(false);
    expect(isValidWebsiteUrl('ftp://files')).toBe(false);
  });
});

describe('block lists', () => {
  it('collects authors hidden in either direction', () => {
    expect(
      collectHiddenAuthorIds({
        viewerId: 'me',
        blocks: [
          { blockerId: 'me', blockedId: 'them' },
          { blockerId: 'other', blockedId: 'me' },
        ],
      }).sort(),
    ).toEqual(['other', 'them']);
  });
});

describe('block filter', () => {
  it('hides authors blocked in either direction', () => {
    const hidden = shouldExcludeAuthorFromFeed({
      viewerId: 'me',
      authorId: 'them',
      blockedIds: ['them'],
    });
    expect(hidden).toBe(true);
    expect(
      shouldExcludeAuthorFromFeed({
        viewerId: 'me',
        authorId: 'friend',
        blockedIds: ['them'],
      }),
    ).toBe(false);
  });

  it('never hides the viewer from themselves', () => {
    expect(
      shouldExcludeAuthorFromFeed({
        viewerId: 'me',
        authorId: 'me',
        blockedIds: ['me'],
      }),
    ).toBe(false);
  });
});
