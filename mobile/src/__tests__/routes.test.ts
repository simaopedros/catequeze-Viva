import { appRoutes, publicRoutes, resolveAuthHref } from '../navigation/routes';

describe('navigation gate', () => {
  it('sends guests to login, 2FA pending to the TOTP screen, and ready users home', () => {
    expect(resolveAuthHref('guest')).toBe(publicRoutes.login);
    expect(resolveAuthHref('needs2fa')).toBe(publicRoutes.twoFactor);
    expect(resolveAuthHref('ready')).toBe(appRoutes.home);
    expect(resolveAuthHref('booting')).toBeNull();
  });

  it('builds deep links for perfil, encontro, bíblia e presença', () => {
    expect(appRoutes.profile('ana')).toBe('/(app)/community/ana');
    expect(appRoutes.attendance('meet-1')).toBe('/(app)/meeting/meet-1/attendance');
    expect(appRoutes.bibleChapter('gn', 1)).toBe('/(app)/bible/gn/1');
  });
});
