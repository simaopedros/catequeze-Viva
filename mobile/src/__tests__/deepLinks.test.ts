import { resolveDeepLinkHref, resolveNotificationHref } from '../navigation/deepLinks';
import { appRoutes } from '../navigation/routes';

describe('resolveDeepLinkHref', () => {
  it('abre publicações a partir de universal links e do scheme catequis', () => {
    expect(resolveDeepLinkHref('https://catechis.app/c/paz-e-bem')).toBe(appRoutes.post('paz-e-bem'));
    expect(resolveDeepLinkHref('https://catechis.app/comunidade/p/paz-e-bem')).toBe(appRoutes.post('paz-e-bem'));
    expect(resolveDeepLinkHref('catequis://c/paz-e-bem')).toBe(appRoutes.post('paz-e-bem'));
    expect(resolveDeepLinkHref('/c/paz-e-bem')).toBe(appRoutes.post('paz-e-bem'));
    expect(resolveDeepLinkHref('exp://192.168.1.20:8081/--/c/paz-e-bem')).toBe(appRoutes.post('paz-e-bem'));
  });

  it('abre conversas, turmas e perfis a partir dos links da web', () => {
    expect(resolveDeepLinkHref('/app/messages?c=conv-1')).toBe(appRoutes.thread('conv-1'));
    expect(resolveDeepLinkHref('/app/messages')).toBe(appRoutes.messages);
    expect(resolveDeepLinkHref('/app/classes/class-9')).toBe(appRoutes.classDetails('class-9'));
    expect(resolveDeepLinkHref('/app/classes/class-9/attendance')).toBe('/(app)/class/class-9/attendance');
    expect(resolveDeepLinkHref('/app/comunidade/u/ana')).toBe(appRoutes.profile('ana'));
    expect(resolveDeepLinkHref('/app/suporte')).toBe(appRoutes.support);
    expect(resolveDeepLinkHref('/app/formacao')).toBe(appRoutes.formation);
    expect(resolveDeepLinkHref('/app/grupos')).toBe(appRoutes.groups);
    expect(resolveDeepLinkHref('/app/notifications')).toBe(appRoutes.notifications);
  });

  it('ignora URLs que a app não sabe abrir', () => {
    expect(resolveDeepLinkHref(null)).toBeNull();
    expect(resolveDeepLinkHref('https://catechis.app/')).toBeNull();
    expect(resolveDeepLinkHref('https://example.com/c/paz')).toBe(appRoutes.post('paz'));
  });
});

describe('resolveNotificationHref', () => {
  it('usa o campo link e cai no tipo da notificação', () => {
    expect(resolveNotificationHref({ link: '/app/messages?c=t1' })).toBe(appRoutes.thread('t1'));
    expect(resolveNotificationHref({ type: 'MEETING', entityId: 'm1' })).toBe(appRoutes.meeting('m1'));
    expect(resolveNotificationHref({ entityType: 'Message', entityId: 'msg-1' })).toBe(appRoutes.messages);
  });
});
