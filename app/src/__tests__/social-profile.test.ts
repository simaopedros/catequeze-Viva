import { describe, expect, it } from 'vitest';
import {
  HANDLE_MAX,
  isValidWebsiteUrl,
  normalizeHandle,
  communityFeedPath,
  communityPostPath,
  communityProfilePath,
  communityTopicPath,
  profilePath,
  toAppCommunityPath,
  sanitizeBio,
  validateHandle,
} from '../shared/socialProfile';
import {
  collectHiddenAuthorIds,
  shouldExcludeAuthorFromFeed,
} from '../shared/socialBlock';
import { zIndex } from '../shared/designTokens';

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
    expect(validateHandle('1maria')).toBeNull();
    expect(validateHandle('Maria Catequista')).toMatch(/letras minúsculas/);
    expect(validateHandle('a'.repeat(HANDLE_MAX + 1))).toMatch(/no máximo/);
  });

  it('builds the public profile path', () => {
    expect(profilePath('Maria_Catequista')).toBe('/u/maria_catequista');
  });

  it('keeps in-app profile links inside the app shell', () => {
    expect(communityProfilePath('Maria', '/app/comunidade')).toBe(
      '/app/comunidade/u/maria',
    );
    expect(communityProfilePath('Maria', '/comunidade')).toBe(
      '/comunidade/u/maria',
    );
  });

  it('keeps topic, post and feed links inside the current shell', () => {
    expect(communityFeedPath('/app/comunidade')).toBe('/app/comunidade');
    expect(communityFeedPath('/comunidade')).toBe('/comunidade');
    expect(communityTopicPath('Liturgia', '/app/comunidade')).toBe(
      '/app/comunidade/t/liturgia',
    );
    expect(communityTopicPath('liturgia', '/comunidade')).toBe(
      '/comunidade/t/liturgia',
    );
    expect(communityTopicPath(null, '/app/comunidade')).toBe('/app/comunidade');
    expect(communityPostPath('paz-e-bem', '/app/dashboard')).toBe(
      '/app/comunidade/p/paz-e-bem',
    );
    expect(communityPostPath('paz-e-bem', '/comunidade')).toBe(
      '/comunidade/p/paz-e-bem',
    );
  });

  it('rewrites stored public Comunidade links into the app shell', () => {
    expect(toAppCommunityPath('/comunidade')).toBe('/app/comunidade');
    expect(toAppCommunityPath('/comunidade/p/paz-e-bem')).toBe(
      '/app/comunidade/p/paz-e-bem',
    );
    expect(toAppCommunityPath('/comunidade/t/liturgia?tab=1')).toBe(
      '/app/comunidade/t/liturgia?tab=1',
    );
    expect(toAppCommunityPath('/u/maria_catequista')).toBe(
      '/app/comunidade/u/maria_catequista',
    );
    expect(toAppCommunityPath('/c/paz-e-bem?ref=share')).toBe(
      '/app/comunidade/p/paz-e-bem?ref=share',
    );
    expect(toAppCommunityPath('/app/classes')).toBe('/app/classes');
    expect(toAppCommunityPath('/settings')).toBe('/settings');
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

describe('cookie stacking', () => {
  it('keeps the cookie banner above sticky chrome and below dialogs', () => {
    expect(zIndex.cookieBanner).toBeGreaterThan(zIndex.sticky);
    expect(zIndex.cookieBanner).toBeLessThan(zIndex.overlay);
    expect(zIndex.cookieBanner).toBeLessThan(zIndex.modal);
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
