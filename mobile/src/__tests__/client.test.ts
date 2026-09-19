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
    await client.socialPost('paz');
    await client.socialComments('post-1');
    await client.createComment('post-1', 'Amém');
    await client.toggleReaction('post-1', 'AMEM');
    await client.searchSocial('catequista');
    await client.socialPulse(40);
    await client.socialConnections({ handle: 'ana', kind: 'followers' });
    await client.socialBlocks();
    await client.reportSocial({ targetType: 'POST', targetId: 'post-1', reason: 'OTHER' });
    await client.bibleBooks();
    await client.bibleBook('gn');
    await client.bibleChapter('gn', 1);
    await client.saveAttendance({ meetingId: 'm1', catechumenProfileId: 'c1', status: 'PRESENT' });

    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.socialAccess);
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.socialProfile('ana'));
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.bibleChapter('gn', 1) + '?locale=pt-BR');
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.socialPulse + '?memberLimit=40');
    expect(urls).toContain(
      'http://localhost:3001' + MOBILE_PATHS.socialConnections + '?handle=ana&kind=followers',
    );
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.socialBlocks);
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.socialReport);
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.attendance);
  });

  it('marks all notifications as read', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init: init || {} });
        return jsonResponse({ success: true });
      },
    });

    await client.markAllNotificationsRead();

    expect(calls[0].url).toBe('http://localhost:3001' + MOBILE_PATHS.notificationsReadAll);
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('builds authenticated download access for documents', async () => {
    const client = createMobileClient({
      getBaseUrl: () => 'https://api.catechis.app/',
      getToken: async () => 'session-9',
      fetchImpl: async () => jsonResponse({}),
    });

    const access = await client.documentFileAccess('doc-1');

    expect(access.url).toBe('https://api.catechis.app/mobile/documents/doc-1');
    expect(access.headers).toEqual({ Authorization: 'Bearer session-9' });
  });

  it('creates conversations and lists contacts', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init: init || {} });
        return jsonResponse({ id: 'conv-1' });
      },
    });

    await client.conversationContacts('ws-1');
    await client.createConversation({ workspaceId: 'ws-1', participantUserIds: ['user-2'], type: 'DIRECT' });

    expect(calls[0].url).toBe('http://localhost:3001' + MOBILE_PATHS.conversationContacts + '?workspaceId=ws-1');
    expect(calls[1].url).toBe('http://localhost:3001' + MOBILE_PATHS.conversations);
    expect(calls[1].init.method).toBe('POST');
    expect(JSON.parse(String(calls[1].init.body))).toEqual({
      workspaceId: 'ws-1',
      participantUserIds: ['user-2'],
      type: 'DIRECT',
    });
  });

  it('covers catechumens and families endpoints', async () => {
    const urls: string[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url) => {
        urls.push(String(url));
        return jsonResponse({ items: [] });
      },
    });

    await client.catechumens({ workspaceId: 'ws-1' });
    await client.catechumenDetails('cat-1');
    await client.families({ communityId: 'community-1', workspaceId: 'ws-1' });
    await client.familyDetails('fam-1');

    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.catechumens + '?workspaceId=ws-1&take=100');
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.catechumenDetails('cat-1'));
    expect(urls).toContain(
      'http://localhost:3001' + MOBILE_PATHS.families + '?communityId=community-1&workspaceId=ws-1',
    );
    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.familyDetails('fam-1'));
  });

  it('uploads media as multipart with Bearer token', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init: init || {} });
        return jsonResponse({ success: true, mediaId: 'media-1', url: '/api/social/media/media-1' });
      },
    });

    const result = await client.uploadSocialImage({ uri: 'file:///tmp/foto.jpg', name: 'foto.jpg', type: 'image/jpeg' });

    expect(result.mediaId).toBe('media-1');
    expect(calls[0].url).toBe('http://localhost:3001' + MOBILE_PATHS.socialImageUpload);
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers).toMatchObject({ Authorization: 'Bearer tok' });
    expect(calls[0].init.body).toBeInstanceOf(FormData);
    expect(String((calls[0].init.headers as Record<string, string>)['Content-Type'])).toBe('undefined');
  });

  it('registers and unregisters push tokens', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init: init || {} });
        return jsonResponse({ success: true });
      },
    });

    await client.registerPushToken('ExponentPushToken[abc]', 'android');
    await client.unregisterPushToken('ExponentPushToken[abc]');

    expect(calls[0].url).toBe('http://localhost:3001' + MOBILE_PATHS.pushToken);
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ token: 'ExponentPushToken[abc]', platform: 'android' });
    expect(calls[1].url).toBe('http://localhost:3001' + MOBILE_PATHS.pushToken);
    expect(calls[1].init.method).toBe('DELETE');
  });

  it('covers the catechesis operation endpoints (Fase B)', async () => {
    const calls: { url: string; method: string; body: any }[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
        return jsonResponse({ id: 'new', success: true });
      },
    });

    await client.createClass({ name: 'Turma A', workspaceId: 'ws-1', maxCapacity: 20 });
    await client.updateClass('c1', { status: 'PAUSED' });
    await client.enrollCatechumens('c1', ['p1', 'p2']);
    await client.cancelEnrollment('c1', 'e1');
    await client.addClassCatechist('c1', 'u1');
    await client.removeClassCatechist('c1', 'u1');
    await client.classAttendanceMatrix('c1', { take: 10 });
    await client.classChat('c1');
    await client.createMeeting({ classId: 'c1', title: 'Encontro', date: '2026-10-03T10:00:00.000Z' });
    await client.updateMeeting('m1', { status: 'IN_PROGRESS' });
    await client.deleteMeeting('m1');
    await client.meetingSheet('m1', 'c1');
    await client.saveAttendanceBatch('m1', [{ catechumenProfileId: 'p1', status: 'PRESENT' }]);
    await client.createCatechumen({ firstName: 'Ana', lastName: 'Silva', workspaceId: 'ws-1' });
    await client.updateCatechumen('p1', { firstName: 'Ana Maria' });
    await client.deleteCatechumen('p1');
    await client.createFamily({ name: 'Família Silva', workspaceId: 'ws-1' });
    await client.updateFamily('f1', { phone: '911' });
    await client.addGuardian('f1', { firstName: 'Maria', relationship: 'MOTHER' });
    await client.updateGuardian('f1', 'g1', { phone: '922' });
    await client.removeGuardian('f1', 'g1');
    await client.communities('ws-1');
    await client.catechists('ws-1');
    await client.consents();
    await client.saveConsent('PHOTOS', true);

    const base = 'http://localhost:3001';
    const find = (method: string, path: string) => calls.find((call) => call.method === method && call.url === base + path);
    expect(find('POST', MOBILE_PATHS.classes)?.body).toMatchObject({ name: 'Turma A', workspaceId: 'ws-1' });
    expect(find('PUT', MOBILE_PATHS.classDetails('c1'))?.body).toEqual({ status: 'PAUSED' });
    expect(find('POST', MOBILE_PATHS.classEnrollments('c1'))?.body).toEqual({ catechumenProfileIds: ['p1', 'p2'] });
    expect(find('DELETE', MOBILE_PATHS.classEnrollment('c1', 'e1'))).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.classCatechists('c1'))?.body).toEqual({ userId: 'u1' });
    expect(find('DELETE', MOBILE_PATHS.classCatechist('c1', 'u1'))).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.classAttendanceMatrix('c1') + '?take=10')).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.classChat('c1'))).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.meetings)?.body).toMatchObject({ classId: 'c1', title: 'Encontro' });
    expect(find('PUT', MOBILE_PATHS.meetingDetails('m1'))?.body).toEqual({ status: 'IN_PROGRESS' });
    expect(find('DELETE', MOBILE_PATHS.meetingDetails('m1'))).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.meetingSheet('m1') + '?classId=c1')).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.attendanceBatch)?.body).toEqual({ meetingId: 'm1', changes: [{ catechumenProfileId: 'p1', status: 'PRESENT' }] });
    expect(find('POST', MOBILE_PATHS.catechumens)?.body).toMatchObject({ firstName: 'Ana' });
    expect(find('PUT', MOBILE_PATHS.catechumenDetails('p1'))?.body).toEqual({ firstName: 'Ana Maria' });
    expect(find('DELETE', MOBILE_PATHS.catechumenDetails('p1'))).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.families)?.body).toMatchObject({ name: 'Família Silva' });
    expect(find('PUT', MOBILE_PATHS.familyDetails('f1'))?.body).toEqual({ phone: '911' });
    expect(find('POST', MOBILE_PATHS.familyGuardians('f1'))?.body).toMatchObject({ firstName: 'Maria' });
    expect(find('PUT', MOBILE_PATHS.familyGuardian('f1', 'g1'))?.body).toEqual({ phone: '922' });
    expect(find('DELETE', MOBILE_PATHS.familyGuardian('f1', 'g1'))).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.communities + '?workspaceId=ws-1')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.catechists + '?workspaceId=ws-1')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.consents)).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.consents)?.body).toEqual({ type: 'PHOTOS', granted: true });
  });

  it('paginates feed and comments with cursors', async () => {
    const urls: string[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url) => {
        urls.push(String(url));
        return jsonResponse({ items: [], nextCursor: null });
      },
    });

    await client.socialFeed({ sort: 'recent', cursor: 'cursor-1' });
    await client.socialComments('post-1', 'cursor-2');
    await client.socialConnections({ handle: 'ana', kind: 'followers', cursor: 'cursor-3' });

    expect(urls).toContain('http://localhost:3001' + MOBILE_PATHS.socialFeed + '?sort=recent&cursor=cursor-1');
    expect(urls).toContain(
      'http://localhost:3001' + MOBILE_PATHS.socialComments + '?postId=post-1&cursor=cursor-2',
    );
    expect(urls).toContain(
      'http://localhost:3001' + MOBILE_PATHS.socialConnections + '?handle=ana&kind=followers&cursor=cursor-3',
    );
  });
});
