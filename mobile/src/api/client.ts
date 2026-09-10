import { MOBILE_PATHS } from './paths';
import type {
  AuthPayload,
  BibleBook,
  BibleChapter,
  BootstrapPayload,
  SocialAccess,
  SocialComment,
  SocialFeed,
  SocialPost,
  SocialProfile,
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

export function createMobileClient(options: MobileClientOptions) {
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
    notifications() {
      return request<any>(MOBILE_PATHS.notifications);
    },
    markNotificationRead(id: string) {
      return request<any>(MOBILE_PATHS.notificationRead(id), { method: 'POST' });
    },
    documents() {
      return request<any>(MOBILE_PATHS.documents);
    },
    socialFeed(query?: {
      cursor?: string | null;
      sort?: 'recent' | 'trending' | 'foryou';
      topicSlug?: string | null;
      authorId?: string | null;
      following?: boolean;
    }) {
      return request<SocialFeed>(withQuery(MOBILE_PATHS.socialFeed, query));
    },
    socialAccess() {
      return request<SocialAccess>(MOBILE_PATHS.socialAccess);
    },
    socialTopics() {
      return request<SocialTopic[]>(MOBILE_PATHS.socialTopics);
    },
    createPost(body: { body: string; topicSlugs?: string[]; share?: { kind: string; sourceId: string } | null }) {
      return request<SocialPost>(MOBILE_PATHS.socialPosts, {
        method: 'POST',
        body: JSON.stringify(body),
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
    socialComments(postId: string) {
      return request<{ items: SocialComment[]; nextCursor: string | null }>(
        withQuery(MOBILE_PATHS.socialComments, { postId }),
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
