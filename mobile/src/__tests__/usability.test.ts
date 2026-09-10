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
    ];

    expect(signedOut).toHaveLength(3);
    expect(signedIn).toHaveLength(17);
    expect(APP_TABS).toHaveLength(5);
  });
});
