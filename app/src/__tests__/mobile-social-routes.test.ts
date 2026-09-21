import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const waspSource = readFileSync(resolve(__dirname, '../../main.wasp'), 'utf8');
const mobileSocialSource = readFileSync(
  resolve(__dirname, '../server/api/mobileSocial.ts'),
  'utf8',
);
const mobilePastoralSource = readFileSync(
  resolve(__dirname, '../server/api/mobilePastoral.ts'),
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
  ['mobileSocialCreateVideoUpload', 'POST', '/mobile/social/videos'],
  ['mobileSocialCreateComment', 'POST', '/mobile/social/comments'],
  ['mobileSocialReact', 'POST', '/mobile/social/react'],
  ['mobileSocialSearch', 'GET', '/mobile/social/search'],
  ['mobileSocialPulse', 'GET', '/mobile/social/pulse'],
  ['mobileSocialConnections', 'GET', '/mobile/social/connections'],
  ['mobileSocialBlocks', 'GET', '/mobile/social/blocks'],
  ['mobileSocialReport', 'POST', '/mobile/social/report'],
  ['mobileBibleBooks', 'GET', '/mobile/bible/books'],
  ['mobileBibleBook', 'GET', '/mobile/bible/books/:id'],
  ['mobileBibleChapter', 'GET', '/mobile/bible/books/:bookId/chapters/:chapter'],
] as const;

const PASTORAL_ROUTES = [
  ['mobileCalendar', 'GET', '/mobile/calendar'],
  ['mobileAnnouncements', 'GET', '/mobile/announcements'],
  ['mobileAcknowledgeAnnouncement', 'POST', '/mobile/announcements/:id/acknowledge'],
  ['mobileJourneys', 'GET', '/mobile/journeys'],
  ['mobileJourney', 'GET', '/mobile/journeys/:id'],
  ['mobileUpdateMilestone', 'POST', '/mobile/journeys/milestones/:id'],
  ['mobileCatechismSearch', 'GET', '/mobile/catechism/search'],
  ['mobileCatechismCategory', 'GET', '/mobile/catechism/categories/:category'],
  ['mobileCatechismEntry', 'GET', '/mobile/catechism/entries/:number'],
  ['mobileDirectorySearch', 'GET', '/mobile/directory/search'],
  ['mobileContentSearch', 'GET', '/mobile/content/search'],
  ['mobileAttendanceSheet', 'GET', '/mobile/meetings/:id/attendance'],
] as const;

describe('mobile social + bible API wiring', () => {
  it.each(REQUIRED_ROUTES)('declares %s as %s %s', (fn, method, path) => {
    expect(waspSource).toContain(`fn: import { ${fn} } from "@src/server/api/mobileSocial"`);
    expect(waspSource).toContain(`httpRoute: (${method}, "${path}")`);
    expect(mobileSocialSource).toContain(`export async function ${fn}`);
  });

  it.each(PASTORAL_ROUTES)('declares %s as %s %s', (fn, method, path) => {
    expect(waspSource).toContain(`fn: import { ${fn} } from "@src/server/api/mobilePastoral"`);
    expect(waspSource).toContain(`httpRoute: (${method}, "${path}")`);
    expect(mobilePastoralSource).toContain(`export async function ${fn}`);
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
