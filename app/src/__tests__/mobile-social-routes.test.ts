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
  ['mobileSocialPost', 'GET', '/mobile/social/posts/:slug'],
  ['mobileSocialComments', 'GET', '/mobile/social/comments'],
  ['mobileSocialCreateComment', 'POST', '/mobile/social/comments'],
  ['mobileSocialReact', 'POST', '/mobile/social/react'],
  ['mobileSocialSearch', 'GET', '/mobile/social/search'],
  ['mobileSocialPulse', 'GET', '/mobile/social/pulse'],
  ['mobileSocialConnections', 'GET', '/mobile/social/connections'],
  ['mobileSocialBlocks', 'GET', '/mobile/social/blocks'],
  ['mobileSocialReport', 'POST', '/mobile/social/report'],
  ['mobileSocialUploadImage', 'POST', '/mobile/social/images'],
  ['mobileSocialUploadVideo', 'POST', '/mobile/social/videos'],
  ['mobileSocialCreateVideoUpload', 'POST', '/mobile/social/video-uploads'],
  ['mobileSocialDeletePost', 'POST', '/mobile/social/posts/:id/delete'],
  ['mobileSocialWatch', 'POST', '/mobile/social/watch'],
  ['mobileSocialFollowState', 'GET', '/mobile/social/follow-state'],
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
    expect(mobileSocialSource).toContain('getSocialPost');
    expect(mobileSocialSource).toContain('getSocialComments');
    expect(mobileSocialSource).toContain('createSocialComment');
    expect(mobileSocialSource).toContain('toggleSocialReaction');
    expect(mobileSocialSource).toContain('searchSocial');
    expect(mobileSocialSource).toContain('getSocialCommunityPulse');
    expect(mobileSocialSource).toContain('listSocialConnections');
    expect(mobileSocialSource).toContain('listMySocialBlocks');
    expect(mobileSocialSource).toContain('reportSocialContent');
    expect(mobileSocialSource).toContain('deleteSocialPost');
    expect(mobileSocialSource).toContain('recordSocialWatch');
    expect(mobileSocialSource).toContain('getSocialFollowState');
    expect(mobileSocialSource).toContain('createSocialVideoUpload');
    expect(mobileSocialSource).toContain('uploadSocialImage');
    expect(mobileSocialSource).toContain('uploadSocialVideo');
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

describe('social media delivery', () => {
  it('allows Expo web on another origin to play stored videos', () => {
    const setupSource = readFileSync(resolve(__dirname, '../server/setup.ts'), 'utf8');
    const mediaSource = readFileSync(
      resolve(__dirname, '../server/api/socialMedia.ts'),
      'utf8',
    );
    expect(setupSource).toContain("prependMiddleware(app as any, '/api/social', applyLocalMobileCors)");
    expect(mediaSource).toContain('Cross-Origin-Resource-Policy');
    expect(mediaSource).toContain('cross-origin');
    expect(mediaSource).toContain('Cross-Origin-Embedder-Policy');
  });
});
