import { APP_TABS, MOBILE_PATHS } from '../api/paths';

describe('mobile path contract', () => {
  it('keeps the pastoral tabs including Agenda', () => {
    expect(APP_TABS.map((tab) => tab.label)).toEqual([
      'Início',
      'Comunidade',
      'Turmas',
      'Agenda',
      'Mensagens',
      'Mais',
    ]);
  });

  it('matches the Wasp /mobile social and bible routes', () => {
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
    expect(MOBILE_PATHS.catechumens).toBe('/mobile/catechumens');
    expect(MOBILE_PATHS.calendar).toBe('/mobile/calendar');
    expect(MOBILE_PATHS.groups).toBe('/mobile/groups');
    expect(MOBILE_PATHS.webBridge).toBe('/mobile/auth/web-bridge');
  });
});
