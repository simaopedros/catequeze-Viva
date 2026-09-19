import { MOBILE_PATHS } from './paths';
import type {
  AuthPayload,
  BibleBook,
  BibleChapter,
  BootstrapPayload,
  SocialAccess,
  SocialBlocks,
  SocialComment,
  SocialConnections,
  SocialFeed,
  SocialPost,
  SocialProfile,
  SocialPulse,
  SocialReportReason,
  SocialSearch,
  SocialShare,
  SocialTopic,
} from './types';

export class MobileApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'MobileApiError';
    this.status = status;
    this.payload = payload;
  }
}

export type TokenProvider = () => Promise<string | null> | string | null;

export type MobileClientOptions = {
  getBaseUrl: () => string;
  getToken: TokenProvider;
  fetchImpl?: typeof fetch;
};

function resolveErrorMessage(payload: any, status: number): string {
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }
  if (typeof payload?.data?.message === 'string') {
    return payload.data.message;
  }
  return `Pedido falhou (${status}).`;
}

export function withQuery(path: string, query?: Record<string, string | number | boolean | null | undefined>) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `${path}?${encoded}` : path;
}

export type UploadFileInput = { uri: string; name: string; type: string } | Blob;

export type ClassInput = {
  name: string;
  communityId?: string | null;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  maxCapacity?: number;
};

export type MeetingInput = {
  title: string;
  theme?: string;
  /** ISO date/time */
  date: string;
  notes?: string;
  contentId?: string | null;
};

export type CatechumenInput = {
  firstName: string;
  lastName: string;
  email?: string | null;
  /** YYYY-MM-DD */
  birthDate?: string | null;
  householdId?: string | null;
  photoUrl?: string | null;
};

export type FamilyInput = {
  name: string;
  address?: string;
  phone?: string;
  communityId?: string;
};

export type GlobalSearchResult = {
  id: string;
  type: string;
  module: string;
  label: string;
  description?: string;
  route?: string;
};

export type GuardianInput = {
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  relationship?: string;
  phone?: string;
};

export function createMobileClient(options: MobileClientOptions) {
  async function upload<T>(path: string, file: UploadFileInput): Promise<T> {
    const token = await options.getToken();
    const baseUrl = options.getBaseUrl().replace(/\/$/, '');
    const form = new FormData();
    if (typeof File !== 'undefined' && file instanceof File) {
      form.append('file', file);
    } else if (typeof Blob !== 'undefined' && file instanceof Blob) {
      form.append('file', file, 'upload.jpg');
    } else {
      form.append('file', file as unknown as Blob);
    }
    const response = await (options.fetchImpl ?? fetch)(`${baseUrl}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    const text = await response.text();
    let payload: any = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }
    }
    if (!response.ok) {
      throw new MobileApiError(response.status, resolveErrorMessage(payload, response.status), payload);
    }
    return payload as T;
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await options.getToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };
    if (init.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const baseUrl = options.getBaseUrl().replace(/\/$/, '');
    try {
      const host = new URL(baseUrl).hostname;
      if (host.endsWith('.loca.lt')) {
        headers['Bypass-Tunnel-Reminder'] = 'true';
      }
    } catch {
      // ignore invalid base URL — the fetch below will fail clearly
    }

    const response = await (options.fetchImpl ?? fetch)(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const text = await response.text();
    let payload: any = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }
    }

    if (!response.ok) {
      throw new MobileApiError(response.status, resolveErrorMessage(payload, response.status), payload);
    }

    return payload as T;
  }

  return {
    request,
    login(email: string, password: string) {
      return request<AuthPayload>(MOBILE_PATHS.login, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    session() {
      return request<AuthPayload>(MOBILE_PATHS.session);
    },
    logout() {
      return request<{ success: boolean }>(MOBILE_PATHS.logout, { method: 'POST' });
    },
    verifyTwoFactor(token: string) {
      return request<AuthPayload>(MOBILE_PATHS.twoFactorVerify, {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    },
    requestPasswordReset(email: string) {
      return request<{ success: boolean }>(MOBILE_PATHS.passwordReset, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    bootstrap() {
      return request<AuthPayload & BootstrapPayload>(MOBILE_PATHS.bootstrap);
    },
    dashboard(workspaceId?: string) {
      return request<any>(withQuery(MOBILE_PATHS.dashboard, { workspaceId }));
    },
    classes(workspaceId?: string) {
      return request<any>(withQuery(MOBILE_PATHS.classes, { workspaceId, take: 50 }));
    },
    classDetails(id: string) {
      return request<any>(MOBILE_PATHS.classDetails(id));
    },
    catechumens(query?: { workspaceId?: string; search?: string; take?: number }) {
      return request<any>(withQuery(MOBILE_PATHS.catechumens, { ...query, take: query?.take ?? 100 }));
    },
    catechumenDetails(id: string) {
      return request<any>(MOBILE_PATHS.catechumenDetails(id));
    },
    families(query?: { communityId?: string; workspaceId?: string }) {
      return request<any>(withQuery(MOBILE_PATHS.families, query));
    },
    familyDetails(id: string) {
      return request<any>(MOBILE_PATHS.familyDetails(id));
    },
    meetings(classId?: string) {
      return request<any>(withQuery(MOBILE_PATHS.meetings, { classId }));
    },
    meetingDetails(id: string) {
      return request<any>(MOBILE_PATHS.meetingDetails(id));
    },
    saveAttendance(body: {
      meetingId: string;
      catechumenProfileId: string;
      status: string;
      note?: string | null;
    }) {
      return request<any>(MOBILE_PATHS.attendance, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    // ── Fase B: operação da catequese ──
    createClass(body: ClassInput & { workspaceId?: string }) {
      return request<any>(MOBILE_PATHS.classes, { method: 'POST', body: JSON.stringify(body) });
    },
    updateClass(id: string, body: Partial<ClassInput> & { status?: string }) {
      return request<any>(MOBILE_PATHS.classDetails(id), { method: 'PUT', body: JSON.stringify(body) });
    },
    classAttendanceMatrix(id: string, query?: { fromDate?: string; toDate?: string; take?: number }) {
      return request<any>(withQuery(MOBILE_PATHS.classAttendanceMatrix(id), query));
    },
    classPlan(id: string, query?: { month?: number; year?: number }) {
      return request<any>(withQuery(MOBILE_PATHS.classPlan(id), query));
    },
    classChat(id: string) {
      return request<{ conversationId: string; created?: boolean }>(MOBILE_PATHS.classChat(id), { method: 'POST' });
    },
    enrollCatechumens(classId: string, catechumenProfileIds: string[]) {
      return request<any>(MOBILE_PATHS.classEnrollments(classId), {
        method: 'POST',
        body: JSON.stringify({ catechumenProfileIds }),
      });
    },
    cancelEnrollment(classId: string, enrollmentId: string) {
      return request<any>(MOBILE_PATHS.classEnrollment(classId, enrollmentId), { method: 'DELETE' });
    },
    addClassCatechist(classId: string, userId: string) {
      return request<any>(MOBILE_PATHS.classCatechists(classId), { method: 'POST', body: JSON.stringify({ userId }) });
    },
    removeClassCatechist(classId: string, userId: string) {
      return request<any>(MOBILE_PATHS.classCatechist(classId, userId), { method: 'DELETE' });
    },
    communities(workspaceId?: string) {
      return request<any>(withQuery(MOBILE_PATHS.communities, { workspaceId }));
    },
    catechists(workspaceId: string) {
      return request<any>(withQuery(MOBILE_PATHS.catechists, { workspaceId }));
    },
    createMeeting(body: MeetingInput & { classId: string }) {
      return request<any>(MOBILE_PATHS.meetings, { method: 'POST', body: JSON.stringify(body) });
    },
    updateMeeting(id: string, body: Partial<MeetingInput> & { status?: string }) {
      return request<any>(MOBILE_PATHS.meetingDetails(id), { method: 'PUT', body: JSON.stringify(body) });
    },
    deleteMeeting(id: string) {
      return request<any>(MOBILE_PATHS.meetingDetails(id), { method: 'DELETE' });
    },
    meetingAttendance(id: string) {
      return request<any>(MOBILE_PATHS.meetingAttendance(id));
    },
    meetingSheet(id: string, classId: string) {
      return request<any>(withQuery(MOBILE_PATHS.meetingSheet(id), { classId }));
    },
    justifyAbsenceByMeeting(meetingId: string, catechumenProfileId: string, note: string) {
      return request<any>(MOBILE_PATHS.meetingJustify(meetingId), {
        method: 'POST',
        body: JSON.stringify({ catechumenProfileId, note }),
      });
    },
    justifyAbsence(attendanceId: string, note: string) {
      return request<any>(MOBILE_PATHS.attendanceJustify, { method: 'POST', body: JSON.stringify({ attendanceId, note }) });
    },
    saveAttendanceBatch(meetingId: string, changes: { catechumenProfileId: string; status: string; note?: string | null }[]) {
      return request<any>(MOBILE_PATHS.attendanceBatch, { method: 'POST', body: JSON.stringify({ meetingId, changes }) });
    },
    createCatechumen(body: CatechumenInput & { workspaceId?: string }) {
      return request<any>(MOBILE_PATHS.catechumens, { method: 'POST', body: JSON.stringify(body) });
    },
    updateCatechumen(id: string, body: Partial<CatechumenInput>) {
      return request<any>(MOBILE_PATHS.catechumenDetails(id), { method: 'PUT', body: JSON.stringify(body) });
    },
    deleteCatechumen(id: string) {
      return request<any>(MOBILE_PATHS.catechumenDetails(id), { method: 'DELETE' });
    },
    catechumenAttendanceReport(id: string) {
      return request<any>(MOBILE_PATHS.catechumenAttendanceReport(id));
    },
    catechumenUploadToken(id: string, workspaceId?: string) {
      return request<any>(MOBILE_PATHS.catechumenUploadToken(id), { method: 'POST', body: JSON.stringify({ workspaceId }) });
    },
    createFamily(body: FamilyInput & { workspaceId?: string }) {
      return request<any>(MOBILE_PATHS.families, { method: 'POST', body: JSON.stringify(body) });
    },
    updateFamily(id: string, body: Partial<FamilyInput>) {
      return request<any>(MOBILE_PATHS.familyDetails(id), { method: 'PUT', body: JSON.stringify(body) });
    },
    addGuardian(familyId: string, body: GuardianInput) {
      return request<any>(MOBILE_PATHS.familyGuardians(familyId), { method: 'POST', body: JSON.stringify(body) });
    },
    updateGuardian(familyId: string, guardianId: string, body: Partial<GuardianInput>) {
      return request<any>(MOBILE_PATHS.familyGuardian(familyId, guardianId), { method: 'PUT', body: JSON.stringify(body) });
    },
    removeGuardian(familyId: string, guardianId: string) {
      return request<any>(MOBILE_PATHS.familyGuardian(familyId, guardianId), { method: 'DELETE' });
    },
    consents() {
      return request<any>(MOBILE_PATHS.consents);
    },
    saveConsent(type: string, granted: boolean) {
      return request<any>(MOBILE_PATHS.consents, { method: 'POST', body: JSON.stringify({ type, granted }) });
    },
    // ── Fase C: comunicação ──
    markConversationRead(id: string, workspaceId?: string) {
      return request<any>(MOBILE_PATHS.conversationRead(id), { method: 'POST', body: JSON.stringify({ workspaceId }) });
    },
    muteConversation(id: string, mute: boolean, workspaceId?: string) {
      return request<any>(MOBILE_PATHS.conversationMute(id), { method: 'POST', body: JSON.stringify({ mute, workspaceId }) });
    },
    removeConversationParticipant(id: string, userId: string, workspaceId?: string) {
      return request<any>(withQuery(MOBILE_PATHS.conversationParticipant(id, userId), { workspaceId }), { method: 'DELETE' });
    },
    deleteSocialPost(postId: string) {
      return request<any>(MOBILE_PATHS.socialPostDelete(postId), { method: 'DELETE' });
    },
    deleteSocialComment(commentId: string) {
      return request<any>(MOBILE_PATHS.socialCommentDelete(commentId), { method: 'DELETE' });
    },
    registerSocialShare(postId: string) {
      return request<any>(MOBILE_PATHS.socialShare, { method: 'POST', body: JSON.stringify({ postId }) });
    },
    recordSocialWatch(postId: string, watchSeconds?: number, completionRate?: number | null) {
      return request<any>(MOBILE_PATHS.socialWatch, { method: 'POST', body: JSON.stringify({ postId, watchSeconds, completionRate }) });
    },
    socialFollowState(authorIds: string[]) {
      return request<{ following: string[] }>(withQuery(MOBILE_PATHS.socialFollowState, { authorIds: authorIds.join(',') }));
    },
    dashboardFocus(workspaceId?: string) {
      return request<any>(withQuery(MOBILE_PATHS.dashboardFocus, { workspaceId, surface: 'STAFF' }));
    },
    announcements(workspaceId?: string) {
      return request<any>(withQuery(MOBILE_PATHS.announcements, { workspaceId }));
    },
    acknowledgeAnnouncement(id: string) {
      return request<any>(MOBILE_PATHS.announcementAck(id), { method: 'POST' });
    },
    birthdays(query?: { classId?: string; days?: number }) {
      return request<any>(withQuery(MOBILE_PATHS.birthdays, query));
    },
    toggleBirthdayGift(catechumenId: string, year?: number) {
      return request<any>(MOBILE_PATHS.birthdayGift, { method: 'POST', body: JSON.stringify({ catechumenId, year }) });
    },
    globalSearch(q: string, locale?: string) {
      return request<GlobalSearchResult[]>(withQuery(MOBILE_PATHS.globalSearch, { q, locale }));
    },
    conversations(workspaceId?: string) {
      return request<any>(withQuery(MOBILE_PATHS.messages, { workspaceId }));
    },
    conversation(id: string) {
      return request<any>(MOBILE_PATHS.messageDetails(id));
    },
    sendMessage(conversationId: string, content: string) {
      return request<any>(MOBILE_PATHS.messages, {
        method: 'POST',
        body: JSON.stringify({ conversationId, content }),
      });
    },
    conversationContacts(workspaceId: string) {
      return request<any>(withQuery(MOBILE_PATHS.conversationContacts, { workspaceId }));
    },
    createConversation(body: {
      workspaceId: string;
      participantUserIds: string[];
      type?: 'DIRECT' | 'GROUP';
      title?: string;
    }) {
      return request<any>(MOBILE_PATHS.conversations, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    notifications() {
      return request<any>(MOBILE_PATHS.notifications);
    },
    markNotificationRead(id: string) {
      return request<any>(MOBILE_PATHS.notificationRead(id), { method: 'POST' });
    },
    documents() {
      return request<any>(MOBILE_PATHS.documents);
    },
    async documentFileAccess(id: string): Promise<{ url: string; headers: Record<string, string> }> {
      const token = await options.getToken();
      const baseUrl = options.getBaseUrl().replace(/\/$/, '');
      return {
        url: `${baseUrl}${MOBILE_PATHS.document(id)}`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      };
    },
    markAllNotificationsRead() {
      return request<{ success?: boolean }>(MOBILE_PATHS.notificationsReadAll, { method: 'POST' });
    },
    socialFeed(query?: {
      cursor?: string | null;
      sort?: 'recent' | 'trending' | 'foryou';
      topicSlug?: string | null;
      authorId?: string | null;
      following?: boolean;
      videoFormat?: 'SHORT' | 'LONG' | null;
    }) {
      return request<SocialFeed>(withQuery(MOBILE_PATHS.socialFeed, query));
    },
    socialAccess() {
      return request<SocialAccess>(MOBILE_PATHS.socialAccess);
    },
    socialTopics() {
      return request<SocialTopic[]>(MOBILE_PATHS.socialTopics);
    },
    createPost(body: {
      body: string;
      topicSlugs?: string[];
      share?: { kind: string; sourceId: string } | null;
      mediaIds?: string[];
    }) {
      return request<SocialPost>(MOBILE_PATHS.socialPosts, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    uploadSocialImage(file: UploadFileInput) {
      return upload<{ success: boolean; mediaId: string; url: string }>(MOBILE_PATHS.socialImageUpload, file);
    },
    uploadSocialVideo(file: UploadFileInput) {
      return upload<{ success: boolean; mediaId: string; url?: string }>(MOBILE_PATHS.socialVideoUpload, file);
    },
    uploadProfileAvatar(file: UploadFileInput) {
      return upload<{ success: boolean; avatarUrl?: string; url?: string }>(MOBILE_PATHS.profileAvatarUpload, file);
    },
    registerPushToken(token: string, platform?: string) {
      return request<{ success: boolean }>(MOBILE_PATHS.pushToken, {
        method: 'POST',
        body: JSON.stringify({ token, platform }),
      });
    },
    unregisterPushToken(token: string) {
      return request<{ success: boolean }>(MOBILE_PATHS.pushToken, {
        method: 'DELETE',
        body: JSON.stringify({ token }),
      });
    },
    socialProfile(handle: string) {
      return request<SocialProfile>(MOBILE_PATHS.socialProfile(handle));
    },
    mySocialProfile() {
      return request<SocialProfile>(MOBILE_PATHS.socialMe);
    },
    updateSocialProfile(body: { handle?: string; bio?: string; websiteUrl?: string | null }) {
      return request<SocialProfile>(MOBILE_PATHS.socialProfileUpdate, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    toggleFollow(authorId: string) {
      return request<{ following: boolean }>(MOBILE_PATHS.socialFollow, {
        method: 'POST',
        body: JSON.stringify({ authorId }),
      });
    },
    toggleBlock(userId: string) {
      return request<{ blocked: boolean }>(MOBILE_PATHS.socialBlock, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    },
    previewShare(kind: string, sourceId: string) {
      return request<SocialShare>(MOBILE_PATHS.socialSharePreview, {
        method: 'POST',
        body: JSON.stringify({ kind, sourceId }),
      });
    },
    socialPost(slug: string) {
      return request<SocialPost>(MOBILE_PATHS.socialPost(slug));
    },
    socialComments(postId: string, cursor?: string | null) {
      return request<{ items: SocialComment[]; nextCursor: string | null }>(
        withQuery(MOBILE_PATHS.socialComments, { postId, cursor }),
      );
    },
    createComment(postId: string, body: string) {
      return request<{ id: string; held?: boolean }>(MOBILE_PATHS.socialComments, {
        method: 'POST',
        body: JSON.stringify({ postId, body }),
      });
    },
    toggleReaction(postId: string, type: 'AMEM' | 'REZO' | 'ALELUIA' = 'AMEM') {
      return request<{ reaction: string | null; reactionCount: number }>(MOBILE_PATHS.socialReact, {
        method: 'POST',
        body: JSON.stringify({ postId, type }),
      });
    },
    searchSocial(q: string) {
      return request<SocialSearch>(withQuery(MOBILE_PATHS.socialSearch, { q }));
    },
    socialPulse(memberLimit = 40) {
      return request<SocialPulse>(withQuery(MOBILE_PATHS.socialPulse, { memberLimit }));
    },
    socialConnections(query: {
      handle?: string | null;
      userId?: string | null;
      kind?: 'followers' | 'following';
      cursor?: string | null;
    }) {
      return request<SocialConnections>(withQuery(MOBILE_PATHS.socialConnections, query));
    },
    socialBlocks() {
      return request<SocialBlocks>(MOBILE_PATHS.socialBlocks);
    },
    reportSocial(body: {
      targetType: 'POST' | 'COMMENT';
      targetId: string;
      reason?: SocialReportReason;
      details?: string;
    }) {
      return request<{ created?: boolean; duplicate?: boolean }>(MOBILE_PATHS.socialReport, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    bibleBooks(locale = 'pt-BR') {
      return request<BibleBook[]>(withQuery(MOBILE_PATHS.bibleBooks, { locale }));
    },
    bibleBook(id: string, locale = 'pt-BR') {
      return request<BibleBook>(withQuery(MOBILE_PATHS.bibleBook(id), { locale }));
    },
    bibleChapter(bookId: string, chapter: number, locale = 'pt-BR') {
      return request<BibleChapter>(withQuery(MOBILE_PATHS.bibleChapter(bookId, chapter), { locale }));
    },
  };
}

export type MobileClient = ReturnType<typeof createMobileClient>;
