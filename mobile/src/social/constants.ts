/** Mirrors app/src/shared/socialConstants.ts for client-side checks. */
export const MAX_SOCIAL_VIDEO_BYTES = 60 * 1024 * 1024;

export const DEFAULT_COMPOSE_MEDIA_LIMITS = {
  maxMediaPerPost: 4,
  maxVideoSeconds: 180,
} as const;
