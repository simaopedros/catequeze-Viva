import { APP_TABS } from '../api/paths';
import { appRoutes, publicRoutes } from '../navigation/routes';

describe('usability map', () => {
  it('covers the signed-out and signed-in journeys the product asked for', () => {
    const signedOut = [publicRoutes.login, publicRoutes.twoFactor, publicRoutes.forgotPassword];
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
      appRoutes.catechumens,
      appRoutes.families,
      appRoutes.content,
      appRoutes.calendar,
      appRoutes.announcements,
      appRoutes.formation,
      appRoutes.sacraments,
      appRoutes.catechism,
      appRoutes.reports,
      appRoutes.billing,
      appRoutes.settings,
      appRoutes.familyInvites,
      appRoutes.journeyTemplates,
      appRoutes.parishes,
      appRoutes.consents,
    ];

    expect(signedOut).toHaveLength(3);
    expect(signedIn).toContain(appRoutes.calendar);
    expect(appRoutes.calendar).toBe('/(app)/(tabs)/calendar');
    expect(appRoutes.messages).toBe('/(app)/messages');
    expect(APP_TABS.map((tab) => tab.name)).toEqual(['index', 'community', 'classes', 'calendar', 'more']);
  });
});
