import type { SocialAccess } from '../api/types';

export const MAX_POST_BODY_LENGTH = 3000;
export const MAX_TOPICS_PER_POST = 3;

export const REPORT_REASONS = [
  { id: 'DOCTRINE', label: 'Contrário à doutrina católica' },
  { id: 'HATE', label: 'Discurso de ódio ou assédio' },
  { id: 'SEXUAL', label: 'Conteúdo sexual' },
  { id: 'VIOLENCE', label: 'Violência' },
  { id: 'SPAM', label: 'Spam ou golpe' },
  { id: 'MINOR_PRIVACY', label: 'Exposição indevida de criança ou adolescente' },
  { id: 'OTHER', label: 'Outro motivo' },
] as const;

export const FEED_TABS = [
  { id: 'foryou', label: 'Para você' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'recent', label: 'Recentes' },
  { id: 'trending', label: 'Em alta' },
  { id: 'following', label: 'A seguir' },
] as const;

export const RHEMA_TABS = [
  { id: 'following', label: 'Seguindo' },
  { id: 'foryou', label: 'Para você' },
] as const;

export type FeedTabId = (typeof FEED_TABS)[number]['id'];

export const SHORT_VIDEO_MAX_SECONDS = 180;

export function feedQueryForTab(tab: FeedTabId) {
  if (tab === 'shorts') return { sort: 'recent' as const, videoFormat: 'SHORT' as const, following: false };
  if (tab === 'following') return { sort: 'recent' as const, following: true, videoFormat: 'SHORT' as const };
  if (tab === 'trending') return { sort: 'trending' as const, following: false, videoFormat: 'SHORT' as const };
  if (tab === 'recent') return { sort: 'recent' as const, following: false, videoFormat: 'SHORT' as const };
  return { sort: 'foryou' as const, following: false, videoFormat: 'SHORT' as const };
}

export function resolveMediaUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('file:')) return path;
  const base = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function playableVideo(post: {
  media?: {
    kind?: string;
    videoUrl?: string | null;
    embedUrl?: string | null;
    thumbnailUrl?: string | null;
    durationSeconds?: number | null;
  }[];
}) {
  return (post.media || []).find(
    (item) => item.kind === 'VIDEO' && Boolean(item.embedUrl || item.videoUrl),
  );
}

export function videoDuration(post: {
  media?: { kind?: string; durationSeconds?: number | null }[];
}) {
  const videos = (post.media || []).filter((item) => item.kind === 'VIDEO');
  if (videos.length === 0) return 0;
  return Math.max(...videos.map((item) => item.durationSeconds ?? 0));
}

export function isLongVideo(post: {
  videoFormat?: 'SHORT' | 'LONG' | null;
  media?: { kind?: string; durationSeconds?: number | null }[];
}) {
  if (post.videoFormat === 'LONG') return true;
  return videoDuration(post) > SHORT_VIDEO_MAX_SECONDS;
}

export function communityPublishNotice(access?: Partial<SocialAccess> | null): string | null {
  if (!access) return null;
  if (access.banned || access.reason === 'banned') {
    return 'Conta suspensa na Comunidade. Fale com o suporte para rever a suspensão.';
  }
  if (!access.canPublish && access.reason === 'quota') {
    return 'Você já publicou tudo o que o seu plano permite hoje. Tente novamente amanhã.';
  }
  if (!access.canPublish && access.reason === 'subscription') {
    return 'Assine para publicar. Ler e compartilhar a Comunidade é livre.';
  }
  if (!access.canPublish) return 'Assine para publicar.';
  if (access.quotaLeft != null) {
    return access.quotaLeft === 1
      ? '1 publicação restante hoje'
      : `${access.quotaLeft} publicações restantes hoje`;
  }
  return null;
}

export function publicPostUrl(slug: string, origin?: string) {
  const host = origin || 'https://catequis.app';
  return `${host.replace(/\/$/, '')}/c/${slug}`;
}
