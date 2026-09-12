/**
 * Subtle Comunidade invite prompt: first visit, then every 2 days while the
 * person still has no followers and is not following anyone.
 */
import { normalizeHandle, profilePath } from "./socialProfile";

export const SOCIAL_INVITE_STORAGE_KEY = "cv-social-invite-dismissed";
export const SOCIAL_INVITE_COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;

export type InvitePromptStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function isSociallyLonely(args: {
  followerCount?: number | null;
  followingCount?: number | null;
}): boolean {
  return (args.followerCount ?? 0) === 0 && (args.followingCount ?? 0) === 0;
}

export function shouldShowSocialInvitePrompt({
  lonely,
  dismissedAt,
  now,
}: {
  lonely: boolean;
  dismissedAt: number | null;
  now: number;
}): boolean {
  if (!lonely) return false;
  if (dismissedAt == null) return true;
  return now - dismissedAt >= SOCIAL_INVITE_COOLDOWN_MS;
}

export function buildSocialInviteUrl({
  origin,
  handle,
}: {
  origin: string;
  handle?: string | null;
}): string {
  const base = (origin || "").replace(/\/$/, "");
  const normalized = handle ? normalizeHandle(handle) : "";
  if (normalized) return `${base}${profilePath(normalized)}`;
  return `${base}/comunidade`;
}

export function buildSocialInviteWhatsappHref(
  message: string,
  url: string,
): string {
  return `https://wa.me/?text=${encodeURIComponent(`${message}\n${url}`)}`;
}

function defaultStorage(): InvitePromptStorage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readSocialInviteDismissedAt(
  storage: InvitePromptStorage | null = defaultStorage(),
): number | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SOCIAL_INVITE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp?: unknown };
    const timestamp = Number(parsed?.timestamp);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

export function writeSocialInviteDismissedAt(
  now = Date.now(),
  storage: InvitePromptStorage | null = defaultStorage(),
): number {
  if (!storage) return now;
  try {
    storage.setItem(
      SOCIAL_INVITE_STORAGE_KEY,
      JSON.stringify({ timestamp: now }),
    );
  } catch {
    /* private mode / quota */
  }
  return now;
}
