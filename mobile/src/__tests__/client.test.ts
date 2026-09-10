import { createMobileClient, MobileApiError, withQuery } from '../api/client';
import { MOBILE_PATHS } from '../api/paths';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('mobile HTTP client', () => {
  it('builds query strings without empty values', () => {
    expect(withQuery('/mobile/social/feed', { sort: 'recent', topicSlug: null, cursor: '' })).toBe(
      '/mobile/social/feed?sort=recent',
    );
  });

  it('sends Bearer tokens and JSON bodies', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'https://api.catechis.app/',
      getToken: () => 'session-1',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init: init || {} });
        return jsonResponse({ authenticated: true, sessionId: 'session-1' });
      },
    });

    await client.login('ana@paroquia.pt', 'Teste@123');
    await client.socialFeed({ sort: 'foryou', following: true });

    expect(calls[0].url).toBe('https://api.catechis.app/mobile/auth/login');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers).toMatchObject({
      Authorization: 'Bearer session-1',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      email: 'ana@paroquia.pt',
      password: 'Teste@123',
    });
    expect(calls[1].url).toBe('https://api.catechis.app/mobile/social/feed?sort=foryou&following=true');
  });

  it('maps Wasp HTTP errors to MobileApiError', async () => {
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => null,
      fetchImpl: async () => jsonResponse({ message: 'Credenciais inválidas.' }, 401),
    });

    await expect(client.login('x@y.z', 'nope')).rejects.toMatchObject({
      name: 'MobileApiError',
      status: 401,
      message: 'Credenciais inválidas.',
    });
    await expect(client.login('x@y.z', 'nope')).rejects.toBeInstanceOf(MobileApiError);
  });

  it('covers comunidade, bíblia and pastoral endpoints', async () => {
    const urls: string[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url) => {
        urls.push(String(url));
        return jsonResponse({ items: [], nextCursor: null, success: true });
      },
    });

    await client.socialAccess();
    await client.socialTopics();
    await client.createPost({ body: 'Paz', share: { kind: 'VERSE', sourceId: 'gn:1:1' } });
    await client.socialProfile('ana');
    await client.mySocialProfile();
    await client.updateSocialProfile({ handle: 'ana', bio: 'Catequista' });
    await client.toggleFollow('user-2');
    await client.toggleBlock('user-2');
    await client.previewShare('VERSE', 'gn:1:1');
    await client.bibleBooks();
    await client.bibleBook('gn');
    await client.bibleChapter('gn', 1);
    await client.saveAttendance({ meetingId: 'm1', catechumenProfileId: 'c1', status: 'PRESENT' });

    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.socialAccess);
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.socialProfile('ana'));
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.bibleChapter('gn', 1) + '?locale=pt-BR');
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.attendance);
  });
});
