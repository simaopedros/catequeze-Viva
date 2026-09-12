import { APP_TABS, MOBILE_PATHS } from '../api/paths';

describe('mobile path contract', () => {
  it('keeps the five pastoral tabs', () => {
    expect(APP_TABS.map((tab) => tab.label)).toEqual([
      'Início',
      'Comunidade',
      'Turmas',
      'Calendário',
      'Mais',
    ]);
  });

  it('matches the Wasp /mobile social, bible and platform routes', () => {
    expect(MOBILE_PATHS.socialFeed).toBe('/mobile/social/feed');
    expect(MOBILE_PATHS.socialFeed).toBe('/mobile/social/feed');
    expect(MOBILE_PATHS.socialAccess).toBe('/mobile/social/access');
    expect(MOBILE_PATHS.socialTopics).toBe('/mobile/social/topics');
    expect(MOBILE_PATHS.socialPosts).toBe('/mobile/social/posts');
    expect(MOBILE_PATHS.socialProfile('Ana')).toBe('/mobile/social/profile/Ana');
    expect(MOBILE_PATHS.socialMe).toBe('/mobile/social/me');
    expect(MOBILE_PATHS.socialPost('paz')).toBe('/mobile/social/posts/paz');
    expect(MOBILE_PATHS.socialComments).toBe('/mobile/social/comments');
    expect(MOBILE_PATHS.socialReact).toBe('/mobile/social/react');
    expect(MOBILE_PATHS.socialSearch).toBe('/mobile/social/search');
    expect(MOBILE_PATHS.bibleBooks).toBe('/mobile/bible/books');
    expect(MOBILE_PATHS.bibleChapter('jo', 3)).toBe('/mobile/bible/books/jo/chapters/3');
    expect(MOBILE_PATHS.content).toBe('/mobile/content');
    expect(MOBILE_PATHS.catechumens).toBe('/mobile/catechumens');
    expect(MOBILE_PATHS.announcements).toBe('/mobile/announcements');
    expect(MOBILE_PATHS.meetingAttendance('m1')).toBe('/mobile/meetings/m1/attendance');
    expect(MOBILE_PATHS.familyInvites).toBe('/mobile/family-invites');
    expect(MOBILE_PATHS.journeyTemplates).toBe('/mobile/journey-templates');
    expect(MOBILE_PATHS.parishes).toBe('/mobile/parishes');
    expect(MOBILE_PATHS.consents).toBe('/mobile/consents');
  });
});
