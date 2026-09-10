/**
 * Public Comunidade profile: @handle, bio and profile URL.
 * Separate from User.username, which signup still fills with the email.
 * Limits match the homologação Rhema (`socialConstants`).
 */
import {
  SOCIAL_BIO_MAX,
  SOCIAL_HANDLE_MAX,
  SOCIAL_HANDLE_MIN,
  SOCIAL_HANDLE_PATTERN,
} from "./socialConstants";

export const HANDLE_MIN = SOCIAL_HANDLE_MIN;
export const HANDLE_MAX = SOCIAL_HANDLE_MAX;
export const BIO_MAX = SOCIAL_BIO_MAX;
export const WEBSITE_MAX = 200;

export const HANDLE_PATTERN = SOCIAL_HANDLE_PATTERN;

export const RESERVED_HANDLES = new Set([
  'admin',
  'administrador',
  'api',
  'app',
  'auth',
  'bible',
  'blog',
  'c',
  'catechism',
  'catequese',
  'comunidade',
  'contact',
  'contato',
  'directory',
  'help',
  'login',
  'me',
  'mod',
  'moderator',
  'null',
  'official',
  'pricing',
  'privacy',
  'profile',
  'rhema',
  'root',
  'settings',
  'signup',
  'social',
  'staff',
  'support',
  'system',
  'terms',
  'u',
  'undefined',
  'user',
]);

export function normalizeHandle(raw: string): string {
  return (raw || '').trim().toLowerCase().replace(/^@+/, '');
}

/** Error message, or null when the handle is usable. */
export function validateHandle(raw: string): string | null {
  const handle = normalizeHandle(raw);
  if (!handle) return 'Escolha um @ de usuário.';
  if (handle.length < HANDLE_MIN) return `O @ deve ter pelo menos ${HANDLE_MIN} caracteres.`;
  if (handle.length > HANDLE_MAX) return `O @ deve ter no máximo ${HANDLE_MAX} caracteres.`;
  if (!HANDLE_PATTERN.test(handle)) {
    return 'Use letras minúsculas, números e underscore.';
  }
  if (RESERVED_HANDLES.has(handle)) return 'Este @ não está disponível.';
  return null;
}

export function profilePath(handle: string): string {
  return `/u/${normalizeHandle(handle)}`;
}

/** In-app stays in the app shell; public feed uses the public Comunidade route. */
export function communityProfilePath(
  handle: string | null | undefined,
  pathname?: string,
): string {
  const normalized = normalizeHandle(handle || "");
  if (pathname?.startsWith("/app/")) {
    return `/app/comunidade/u/${normalized}`;
  }
  return `/comunidade/u/${normalized}`;
}

export function sanitizeBio(raw: string): string {
  return (raw || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, BIO_MAX);
}

export function isValidWebsiteUrl(raw: string): boolean {
  const value = (raw || '').trim();
  if (!value) return true;
  if (value.length > WEBSITE_MAX) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function normalizeWebsiteUrl(raw: string): string | null {
  const value = (raw || '').trim();
  if (!value) return null;
  if (!isValidWebsiteUrl(value)) {
    throw new Error('URL inválida. Use http:// ou https://.');
  }
  return value.slice(0, WEBSITE_MAX);
}
