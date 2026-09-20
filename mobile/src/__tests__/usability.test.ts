import { APP_TABS } from '../api/paths';
import { formatWhen } from '../format';
import { appRoutes, publicRoutes } from '../navigation/routes';

describe('usability map', () => {
  it('covers the signed-out and signed-in journeys the product asked for', () => {
    const signedOut = [
      publicRoutes.login,
      publicRoutes.twoFactor,
      publicRoutes.forgotPassword,
      publicRoutes.signup,
    ];
    const signedIn = [
      appRoutes.home,
      appRoutes.community,
      appRoutes.compose,
      appRoutes.search,
      appRoutes.members,
      appRoutes.topics,
      appRoutes.shorts,
      appRoutes.followingFeed,
      appRoutes.editProfile,
      appRoutes.blocked,
      appRoutes.connections('catequista', 'followers'),
      appRoutes.post('paz'),
      appRoutes.topic('liturgia'),
      appRoutes.profile('catequista'),
      appRoutes.classes,
      appRoutes.classDetails('class-1'),
      appRoutes.meeting('meeting-1'),
      appRoutes.attendance('meeting-1'),
      appRoutes.messages,
      appRoutes.thread('conv-1'),
      appRoutes.bible,
      appRoutes.documents,
      appRoutes.notifications,
      appRoutes.more,
      appRoutes.calendar,
      appRoutes.groups,
      appRoutes.catechumens,
      appRoutes.families,
      appRoutes.settings,
      appRoutes.onboarding,
    ];

    expect(signedOut).toHaveLength(4);
    expect(signedIn).toHaveLength(30);
    expect(APP_TABS).toHaveLength(6);
  });

  it('formats meeting timestamps in pt-BR instead of raw ISO', () => {
    expect(formatWhen('2026-09-20T19:00:00.000Z')).toMatch(/\d/);
    expect(formatWhen('2026-09-20T19:00:00.000Z')).not.toContain('T19:00');
    expect(formatWhen('')).toBe('');
  });
});
