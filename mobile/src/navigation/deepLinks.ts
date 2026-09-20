import { appRoutes } from './routes';

const HOSTS = new Set(['catechis.app', 'www.catechis.app', 'catequis.app']);

function pathnameAndSearch(input: string): { pathname: string; search: string } | null {
  const raw = input.trim();
  if (!raw) return null;

  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw);
    const url = new URL(hasScheme ? raw : `https://catechis.app${raw.startsWith('/') ? raw : `/${raw}`}`);
    let pathname = url.pathname || '/';
    if (url.protocol === 'catequis:' && url.hostname && !HOSTS.has(url.hostname)) {
      pathname = `/${url.hostname}${pathname === '/' ? '' : pathname}`;
    }
    const marker = pathname.indexOf('/--/');
    if (marker >= 0) pathname = pathname.slice(marker + 3);
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    return { pathname, search: url.search };
  } catch {
    const [pathPart, queryPart] = raw.split('?');
    const pathname = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
    return { pathname, search: queryPart ? `?${queryPart}` : '' };
  }
}

function firstParam(search: string, key: string): string | null {
  if (!search) return null;
  const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(key);
  return value && value.trim() ? value.trim() : null;
}

/**
 * Maps a universal link, custom-scheme URL, or stored notification `link`
 * (web paths like `/app/messages?c=…`) to an Expo Router href.
 */
export function resolveDeepLinkHref(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  const parsed = pathnameAndSearch(input);
  if (!parsed) return null;
  const { pathname, search } = parsed;

  const post =
    pathname.match(/^\/c\/([^/]+)$/) ||
    pathname.match(/^\/comunidade\/p\/([^/]+)$/) ||
    pathname.match(/^\/app\/comunidade\/p\/([^/]+)$/) ||
    pathname.match(/^\/community\/p\/([^/]+)$/);
  if (post?.[1]) return appRoutes.post(decodeURIComponent(post[1]));

  const profile =
    pathname.match(/^\/u\/([^/]+)$/) ||
    pathname.match(/^\/comunidade\/u\/([^/]+)$/) ||
    pathname.match(/^\/app\/comunidade\/u\/([^/]+)$/);
  if (profile?.[1]) return appRoutes.profile(decodeURIComponent(profile[1]));

  const topic = pathname.match(/^\/(?:app\/)?(?:comunidade\/)?t\/([^/]+)$/);
  if (topic?.[1]) return appRoutes.topic(decodeURIComponent(topic[1]));

  const conversationId = firstParam(search, 'c');
  if (pathname === '/app/messages' || pathname === '/messages') {
    return conversationId ? appRoutes.thread(conversationId) : appRoutes.messages;
  }
  const thread = pathname.match(/^\/(?:app\/)?messages\/([^/]+)$/);
  if (thread?.[1]) return appRoutes.thread(decodeURIComponent(thread[1]));

  const classAttendance = pathname.match(/^\/app\/classes\/([^/]+)\/attendance$/);
  if (classAttendance?.[1]) return `/(app)/class/${classAttendance[1]}/attendance`;

  const classDetails = pathname.match(/^\/app\/classes\/([^/]+)$/);
  if (classDetails?.[1]) return appRoutes.classDetails(decodeURIComponent(classDetails[1]));

  const meeting = pathname.match(/^\/app\/(?:meetings|encontros)\/([^/]+)$/);
  if (meeting?.[1]) return appRoutes.meeting(decodeURIComponent(meeting[1]));

  if (pathname === '/app/notifications' || pathname === '/notifications') return appRoutes.notifications;
  if (pathname === '/app/suporte' || pathname === '/support') return appRoutes.support;
  if (pathname === '/app/formacao' || pathname === '/formation') return appRoutes.formation;
  if (pathname === '/app/grupos' || pathname === '/groups') return appRoutes.groups;
  if (pathname === '/app/definicoes' || pathname === '/app/settings' || pathname === '/settings') {
    return appRoutes.settings;
  }
  if (pathname === '/app/comunidade' || pathname === '/comunidade' || pathname === '/community') {
    return appRoutes.community;
  }
  if (pathname === '/c' || pathname === '/') return null;

  return null;
}

export function resolveNotificationHref(item: {
  link?: string | null;
  type?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}): string | null {
  const fromLink = resolveDeepLinkHref(item.link);
  if (fromLink) return fromLink;
  const kind = String(item.entityType || item.type || '').toUpperCase();
  if (kind.includes('MESSAGE')) return appRoutes.messages;
  if (kind.includes('MEETING') && item.entityId) return appRoutes.meeting(item.entityId);
  if ((kind.includes('SOCIAL') || kind.includes('POST')) && item.entityId) return appRoutes.community;
  return appRoutes.notifications;
}
