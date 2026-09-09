/**
 * Pure helpers for the Comunidade feed — no database, no Wasp imports, so they
 * can be unit tested in isolation (same split as conversationPolicies.ts).
 */
import { screenSocialText } from '../../shared/socialModeration';
import {
  MAX_COMMENT_BODY_LENGTH,
  MAX_POST_BODY_LENGTH,
  SHORT_VIDEO_MAX_SECONDS,
  SOCIAL_BIO_MAX,
  SOCIAL_HANDLE_MAX,
  SOCIAL_HANDLE_MIN,
  SOCIAL_HANDLE_PATTERN,
} from '../../shared/socialConstants';

export {
  MAX_COMMENT_BODY_LENGTH,
  MAX_POST_BODY_LENGTH,
  SHORT_VIDEO_MAX_SECONDS,
  SOCIAL_BIO_MAX,
};

export type SocialMediaKind = 'IMAGE' | 'VIDEO';
export type SocialPostKind = 'TEXT' | 'IMAGE' | 'VIDEO';
export type SocialPostStatus = 'PUBLISHED' | 'PENDING_REVIEW' | 'REMOVED';
export type SocialVideoFormat = 'SHORT' | 'LONG';

/** URL-safe slug fragment from the post body, capped for readability. */
export function slugifySocialTitle(body: string, maxLength = 60): string {
  const base = (body || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');

  return base || 'publicacao';
}

/**
 * Shareable slug: readable prefix plus a short random suffix so slugs never
 * collide and are not guessable in sequence.
 */
export function buildSocialSlug(body: string, randomSuffix: string): string {
  return `${slugifySocialTitle(body)}-${randomSuffix}`;
}

/** Post bodies are plain text — strip markup and collapse runaway whitespace. */
export function sanitizeSocialBody(raw: string): string {
  return (raw || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** A post is VIDEO when it carries any video, IMAGE when it carries images. */
export function resolvePostKind(media: { kind: SocialMediaKind }[]): SocialPostKind {
  if (media.some((m) => m.kind === 'VIDEO')) return 'VIDEO';
  if (media.length > 0) return 'IMAGE';
  return 'TEXT';
}

/** Post-moderation: publish immediately unless the screening flags the text. */
export function resolveInitialStatus(body: string): {
  status: SocialPostStatus;
  reasons: string[];
} {
  const screening = screenSocialText(body);
  return {
    status: screening.needsReview ? 'PENDING_REVIEW' : 'PUBLISHED',
    reasons: screening.reasons,
  };
}

export interface SocialPostValidationInput {
  body: string;
  mediaCount: number;
  mediaConsentAck: boolean;
}

/** Returns an error message, or null when the draft is publishable. */
export function validateSocialPostDraft(input: SocialPostValidationInput): string | null {
  const body = sanitizeSocialBody(input.body);

  if (!body && input.mediaCount === 0) {
    return 'Escreva algo ou adicione uma imagem/vídeo.';
  }
  if (body.length > MAX_POST_BODY_LENGTH) {
    return `O texto excede ${MAX_POST_BODY_LENGTH} caracteres.`;
  }
  if (input.mediaCount > 0 && !input.mediaConsentAck) {
    return 'Confirme que você tem autorização de uso de imagem das pessoas retratadas.';
  }
  return null;
}

export function validateSocialCommentDraft(body: string): string | null {
  const clean = sanitizeSocialBody(body);
  if (!clean) return 'Escreva um comentário.';
  if (clean.length > MAX_COMMENT_BODY_LENGTH) {
    return `O comentário excede ${MAX_COMMENT_BODY_LENGTH} caracteres.`;
  }
  return null;
}

// ─── Open Graph (link previews for WhatsApp, Facebook, X) ──────────────────

export interface OgMetadata {
  title: string;
  description: string;
  url: string;
  image?: string;
  video?: string;
  author?: string;
}

const OG_DESCRIPTION_LENGTH = 200;

export function buildOgDescription(body: string): string {
  const clean = sanitizeSocialBody(body).replace(/\n+/g, ' ');
  if (clean.length <= OG_DESCRIPTION_LENGTH) return clean;
  return `${clean.slice(0, OG_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

export function buildOgTitle(body: string, authorName?: string | null): string {
  const clean = sanitizeSocialBody(body).replace(/\n+/g, ' ');
  const excerpt = clean.length > 70 ? `${clean.slice(0, 69).trimEnd()}…` : clean;
  if (excerpt && authorName) return `${excerpt} — ${authorName}`;
  if (excerpt) return excerpt;
  return authorName ? `Publicação de ${authorName}` : 'Comunidade Catequese Viva';
}

/** Minimal HTML document served to link-preview crawlers. */
export function renderOgHtml(meta: OgMetadata, redirectUrl: string): string {
  const escape = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const tags = [
    `<meta property="og:type" content="${meta.video ? 'video.other' : 'article'}" />`,
    `<meta property="og:title" content="${escape(meta.title)}" />`,
    `<meta property="og:description" content="${escape(meta.description)}" />`,
    `<meta property="og:url" content="${escape(meta.url)}" />`,
    `<meta property="og:site_name" content="Catequese Viva" />`,
    meta.image ? `<meta property="og:image" content="${escape(meta.image)}" />` : '',
    meta.video ? `<meta property="og:video" content="${escape(meta.video)}" />` : '',
    `<meta name="twitter:card" content="${meta.image || meta.video ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escape(meta.title)}" />`,
    `<meta name="twitter:description" content="${escape(meta.description)}" />`,
    meta.image ? `<meta name="twitter:image" content="${escape(meta.image)}" />` : '',
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escape(meta.title)}</title>
${tags.join('\n')}
<link rel="canonical" href="${escape(meta.url)}" />
<meta http-equiv="refresh" content="0; url=${escape(redirectUrl)}" />
</head>
<body><p><a href="${escape(redirectUrl)}">${escape(meta.title)}</a></p></body>
</html>`;
}

/** Crawlers that need server-rendered Open Graph tags instead of the SPA. */
const CRAWLER_PATTERN =
  /(facebookexternalhit|facebookcatalog|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|googlebot|bingbot|applebot|embedly|redditbot|skypeuripreview|vkshare|w3c_validator)/i;

export function isLinkPreviewCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_PATTERN.test(userAgent);
}

/** A video is SHORT when every attached video is at most 180s. */
export function resolveVideoFormat(
  media: { kind: string; durationSeconds?: number | null }[],
): SocialVideoFormat | null {
  const videos = media.filter((item) => item.kind === 'VIDEO');
  if (videos.length === 0) return null;
  const maxDuration = Math.max(...videos.map((item) => item.durationSeconds ?? 0));
  return maxDuration > SHORT_VIDEO_MAX_SECONDS ? 'LONG' : 'SHORT';
}

export function socialRecommendationScore(post: {
  reactionCount?: number | null;
  commentCount?: number | null;
  shareCount?: number | null;
  viewCount?: number | null;
}): number {
  return (
    (post.reactionCount ?? 0) * 10 +
    (post.commentCount ?? 0) * 5 +
    (post.shareCount ?? 0) * 20 +
    (post.viewCount ?? 0)
  );
}

const RESERVED_SOCIAL_HANDLES = new Set([
  'admin',
  'comunidade',
  'settings',
  'login',
  'signup',
  'api',
  'app',
  'rhema',
  'me',
  'u',
  'c',
]);

export function normalizeSocialHandle(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

/** Returns an error message, or null when the handle is usable (including empty = clear). */
export function validateSocialHandle(handle: string): string | null {
  if (!handle) return null;
  if (handle.length < SOCIAL_HANDLE_MIN || handle.length > SOCIAL_HANDLE_MAX) {
    return 'Use entre 3 e 30 caracteres.';
  }
  if (!SOCIAL_HANDLE_PATTERN.test(handle)) {
    return 'Use apenas letras minúsculas, números e sublinhado.';
  }
  if (RESERVED_SOCIAL_HANDLES.has(handle)) {
    return 'Este handle não está disponível.';
  }
  return null;
}

export function validateSocialBio(bio: string): string | null {
  if (bio.length > SOCIAL_BIO_MAX) {
    return `A bio pode ter no máximo ${SOCIAL_BIO_MAX} caracteres.`;
  }
  return null;
}
