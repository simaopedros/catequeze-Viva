import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const waspSource = readFileSync(resolve(__dirname, '../../main.wasp'), 'utf8');
const mobileSocialSource = readFileSync(
  resolve(__dirname, '../server/api/mobileSocial.ts'),
  'utf8',
);

const REQUIRED_ROUTES = [
  ['mobileSocialFeed', 'GET', '/mobile/social/feed'],
  ['mobileSocialAccess', 'GET', '/mobile/social/access'],
  ['mobileSocialTopics', 'GET', '/mobile/social/topics'],
  ['mobileSocialCreatePost', 'POST', '/mobile/social/posts'],
  ['mobileSocialProfile', 'GET', '/mobile/social/profile/:handle'],
  ['mobileMySocialProfile', 'GET', '/mobile/social/me'],
  ['mobileUpdateSocialProfile', 'POST', '/mobile/social/profile'],
  ['mobileSocialFollow', 'POST', '/mobile/social/follow'],
  ['mobileSocialBlock', 'POST', '/mobile/social/block'],
  ['mobileSocialSharePreview', 'POST', '/mobile/social/share/preview'],
  ['mobileBibleBooks', 'GET', '/mobile/bible/books'],
  ['mobileBibleBook', 'GET', '/mobile/bible/books/:id'],
  ['mobileBibleChapter', 'GET', '/mobile/bible/books/:bookId/chapters/:chapter'],
] as const;

describe('mobile social + bible API wiring', () => {
  it.each(REQUIRED_ROUTES)('declares %s as %s %s', (fn, method, path) => {
    expect(waspSource).toContain(`fn: import { ${fn} } from "@src/server/api/mobileSocial"`);
    expect(waspSource).toContain(`httpRoute: (${method}, "${path}")`);
    expect(mobileSocialSource).toContain(`export async function ${fn}`);
  });

  it('imports social operations from the modules Wasp already exposes', () => {
    expect(mobileSocialSource).toContain(
      "from '../operations/socialOperations'",
    );
    expect(mobileSocialSource).toContain('getSocialPublishAccess');
    expect(mobileSocialSource).toContain('getSocialTopics');
    expect(mobileSocialSource).toContain('getSocialFeed');
    expect(mobileSocialSource).toContain('createSocialPost');
    expect(mobileSocialSource).toContain(
      "from '../operations/socialProfileOperations'",
    );
    expect(mobileSocialSource).toContain(
      "from '../operations/socialDiscoveryOperations'",
    );
    expect(mobileSocialSource).toContain(
      "from '../operations/socialShareResolve'",
    );
    expect(mobileSocialSource).toContain("from '../operations/bibleOperations'");
    expect(mobileSocialSource).not.toContain("from '../operations/socialAuthor'");
    expect(mobileSocialSource).toContain('UserTwoFactor:');
    expect(mobileSocialSource).toContain('userTwoFactor');
  });
});
