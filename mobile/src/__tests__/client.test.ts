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

  it('covers the communication endpoints (Fase C)', async () => {
    const calls: { url: string; method: string; body: any }[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
        return jsonResponse({ success: true });
      },
    });

    await client.markConversationRead('c1', 'ws-1');
    await client.muteConversation('c1', true);
    await client.removeConversationParticipant('c1', 'u1');
    await client.deleteSocialPost('p1');
    await client.deleteSocialComment('k1');
    await client.registerSocialShare('p1');
    await client.recordSocialWatch('p1', 12, 0.5);
    await client.socialFollowState(['a', 'b']);
    await client.dashboardFocus('ws-1');
    await client.announcements('ws-1');
    await client.acknowledgeAnnouncement('an1');
    await client.birthdays({ days: 30 });
    await client.toggleBirthdayGift('cat-1', 2026);
    await client.globalSearch('ana');

    const base = 'http://localhost:3001';
    const find = (method: string, path: string) => calls.find((call) => call.method === method && call.url === base + path);
    expect(find('POST', MOBILE_PATHS.conversationRead('c1'))?.body).toEqual({ workspaceId: 'ws-1' });
    expect(find('POST', MOBILE_PATHS.conversationMute('c1'))?.body).toMatchObject({ mute: true });
    expect(find('DELETE', MOBILE_PATHS.conversationParticipant('c1', 'u1'))).toBeTruthy();
    expect(find('DELETE', MOBILE_PATHS.socialPostDelete('p1'))).toBeTruthy();
    expect(find('DELETE', MOBILE_PATHS.socialCommentDelete('k1'))).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.socialShare)?.body).toEqual({ postId: 'p1' });
    expect(find('POST', MOBILE_PATHS.socialWatch)?.body).toEqual({ postId: 'p1', watchSeconds: 12, completionRate: 0.5 });
    expect(find('GET', MOBILE_PATHS.socialFollowState + '?authorIds=a%2Cb')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.dashboardFocus + '?workspaceId=ws-1&surface=STAFF')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.announcements + '?workspaceId=ws-1')).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.announcementAck('an1'))).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.birthdays + '?days=30')).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.birthdayGift)?.body).toEqual({ catechumenId: 'cat-1', year: 2026 });
    expect(find('GET', MOBILE_PATHS.globalSearch + '?q=ana')).toBeTruthy();
  });

  it('covers the content endpoints (Fase D)', async () => {
    const calls: { url: string; method: string; body: any }[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), method: init?.method || 'GET', body: init?.body && !(init.body instanceof FormData) ? JSON.parse(String(init.body)) : init?.body ?? null });
        return jsonResponse({ success: true, items: [], nextCursor: null });
      },
    });

    await client.bibleSearch('amor', 20);
    await client.catechismSearch('batismo');
    await client.catechismCategory('creed');
    await client.catechismEntry(27);
    await client.directorySearch('família');
    await client.directoryPart('II');
    await client.directoryEntry(12);
    await client.contentList({ workspaceId: 'ws-1', status: 'PUBLISHED' });
    await client.contentDetails('ct1');
    await client.createContent({ title: 'Plano', workspaceId: 'ws-1' });
    await client.updateContent('ct1', { theme: 'Advento' });
    await client.updateContentStatus('ct1', 'IN_REVIEW');
    await client.calendarEvents('ws-1');
    await client.createCalendarEvent({ name: 'Festa', date: '2026-12-08T12:00:00.000Z', workspaceId: 'ws-1' });
    await client.uploadDocument(new Blob(['x'], { type: 'application/pdf' }), { name: 'Batismo', type: 'BAPTISM_CERTIFICATE', catechumenProfileId: 'p1' });
    await client.verifyDocument('d1');
    await client.rejectDocument('d1', 'ilegível');
    await client.deleteDocument('d1');
    await client.createAnnouncement({ title: 'Aviso', body: 'Texto', audience: 'all', requireAck: true });
    await client.publishAnnouncement('an1');

    const base = 'http://localhost:3001';
    const find = (method: string, path: string) => calls.find((call) => call.method === method && call.url === base + path);
    expect(find('GET', MOBILE_PATHS.bibleSearch + '?q=amor&limit=20')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.catechismSearch + '?q=batismo')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.catechismCategory('creed'))).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.catechismEntry(27))).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.directorySearch + '?q=fam%C3%ADlia')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.directoryPart('II'))).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.directoryEntry(12))).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.content + '?workspaceId=ws-1&status=PUBLISHED')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.contentDetails('ct1'))).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.content)?.body).toMatchObject({ title: 'Plano' });
    expect(find('PUT', MOBILE_PATHS.contentDetails('ct1'))?.body).toEqual({ theme: 'Advento' });
    expect(find('POST', MOBILE_PATHS.contentStatus('ct1'))?.body).toEqual({ status: 'IN_REVIEW' });
    expect(find('GET', MOBILE_PATHS.calendarEvents + '?workspaceId=ws-1')).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.calendarEvents)?.body).toMatchObject({ name: 'Festa' });
    const uploadCall = find('POST', MOBILE_PATHS.documentsUpload);
    expect(uploadCall?.body).toBeInstanceOf(FormData);
    expect((uploadCall?.body as FormData).get('type')).toBe('BAPTISM_CERTIFICATE');
    expect((uploadCall?.body as FormData).get('catechumenProfileId')).toBe('p1');
    expect(find('POST', MOBILE_PATHS.documentVerify('d1'))).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.documentReject('d1'))?.body).toEqual({ reason: 'ilegível' });
    expect(find('DELETE', MOBILE_PATHS.document('d1'))).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.announcements)?.body).toMatchObject({ title: 'Aviso', audience: 'all' });
    expect(find('POST', MOBILE_PATHS.announcementPublish('an1'))).toBeTruthy();
  });

  it('covers the management endpoints (Fase E)', async () => {
    const calls: { url: string; method: string; body: any }[] = [];
    const client = createMobileClient({
      getBaseUrl: () => 'http://localhost:3001',
      getToken: () => 'tok',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
        return jsonResponse({ success: true });
      },
    });

    await client.team('ws-1');
    await client.inviteMember({ email: 'a@b.pt', role: 'LEAD_CATECHIST', workspaceId: 'ws-1', classId: 'c1', classAssignmentRole: 'ASSISTANT' });
    await client.resendInvite({ pendingInvitationId: 'inv1' });
    await client.cancelInvite({ membershipId: 'm1' });
    await client.removeMember('m1');
    await client.updateMemberRole('m1', 'ASSISTANT_CATECHIST');
    await client.setCoordinatorClasses('m1', ['c1', 'c2']);
    await client.familyInvites('ws-1');
    await client.acceptInvitation('m9');
    await client.reportsOverview('ws-1');
    await client.classReport('c1');
    await client.updateProfile({ firstName: 'Ana', lastName: 'Silva' });
    await client.changePassword('old-pass', 'new-pass-123');
    await client.emailPreferences();
    await client.updateEmailPreference('LIFECYCLE', false);
    await client.requestDataExport();
    await client.twoFactorDetails();
    await client.twoFactorStart();
    await client.twoFactorVerifySetup('123456');
    await client.twoFactorDisable('654321');
    await client.pastoralGroups({ mine: true });
    await client.formationTracks('ws-1');
    await client.sacramentalJourneys({ workspaceId: 'ws-1' });
    await client.sacramentalJourney('j1');
    await client.supportMessages();
    await client.joinPastoralGroup('g1');
    await client.leavePastoralGroup('g1');
    await client.enrollInFormationTrack('t1', 'ws-1');
    await client.unenrollFromFormationTrack('t1');
    await client.submitSupportMessage({ name: 'Ana', email: 'ana@p.pt', message: 'Ajuda' });

    const base = 'http://localhost:3001';
    const find = (method: string, path: string) => calls.find((call) => call.method === method && call.url === base + path);
    expect(find('GET', MOBILE_PATHS.team + '?workspaceId=ws-1')).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.teamInvite)?.body).toMatchObject({ email: 'a@b.pt', role: 'LEAD_CATECHIST', classAssignmentRole: 'ASSISTANT' });
    expect(find('POST', MOBILE_PATHS.teamInviteResend)?.body).toEqual({ pendingInvitationId: 'inv1' });
    expect(find('POST', MOBILE_PATHS.teamInviteCancel)?.body).toEqual({ membershipId: 'm1' });
    expect(find('DELETE', MOBILE_PATHS.teamMember('m1'))).toBeTruthy();
    expect(find('PUT', MOBILE_PATHS.teamMemberRole('m1'))?.body).toMatchObject({ role: 'ASSISTANT_CATECHIST' });
    expect(find('PUT', MOBILE_PATHS.teamMemberClasses('m1'))?.body).toEqual({ classIds: ['c1', 'c2'] });
    expect(find('GET', MOBILE_PATHS.familyInvites + '?workspaceId=ws-1')).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.invitationAccept)?.body).toEqual({ membershipId: 'm9' });
    expect(find('GET', MOBILE_PATHS.reportsOverview + '?workspaceId=ws-1')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.classReport('c1'))).toBeTruthy();
    expect(find('PUT', MOBILE_PATHS.profile)?.body).toEqual({ firstName: 'Ana', lastName: 'Silva' });
    expect(find('POST', MOBILE_PATHS.profilePassword)?.body).toEqual({ currentPassword: 'old-pass', newPassword: 'new-pass-123' });
    expect(find('GET', MOBILE_PATHS.emailPreferences)).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.emailPreferences)?.body).toEqual({ topic: 'LIFECYCLE', optedIn: false });
    expect(find('POST', MOBILE_PATHS.dataExport)).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.twoFactor)).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.twoFactorStart)).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.twoFactorVerifySetup)?.body).toEqual({ token: '123456' });
    expect(find('POST', MOBILE_PATHS.twoFactorDisable)?.body).toEqual({ token: '654321' });
    expect(find('GET', MOBILE_PATHS.groups + '?mine=true')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.formation + '?workspaceId=ws-1')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.sacraments + '?workspaceId=ws-1')).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.sacrament('j1'))).toBeTruthy();
    expect(find('GET', MOBILE_PATHS.support)).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.groupJoin('g1'))).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.groupLeave('g1'))).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.formationEnroll('t1'))?.body).toEqual({ workspaceId: 'ws-1' });
    expect(find('POST', MOBILE_PATHS.formationUnenroll('t1'))).toBeTruthy();
    expect(find('POST', MOBILE_PATHS.support)?.body).toEqual({ name: 'Ana', email: 'ana@p.pt', message: 'Ajuda' });
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
