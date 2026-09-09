/** Shared limits for the Comunidade feed — used by both client and server. */
export const MAX_POST_BODY_LENGTH = 3000;
export const MAX_COMMENT_BODY_LENGTH = 1000;
export const MAX_TOPICS_PER_POST = 3;

/** Videos at or below this duration land in the Rhema Shorts rail. */
export const SHORT_VIDEO_MAX_SECONDS = 180;

/** Direct video upload when Bunny Stream is not configured (homolog / local). */
export const MAX_SOCIAL_VIDEO_BYTES = 60 * 1024 * 1024;

export const SOCIAL_HANDLE_MIN = 3;
export const SOCIAL_HANDLE_MAX = 30;
export const SOCIAL_BIO_MAX = 280;
export const SOCIAL_HANDLE_PATTERN = /^[a-z0-9_]+$/;

export const SOCIAL_REACTION_TYPES = ["AMEM", "REZO", "ALELUIA"] as const;
export type SocialReactionType = (typeof SOCIAL_REACTION_TYPES)[number];

export type SocialVideoFormat = "SHORT" | "LONG";
export type SocialFeedSort = "recent" | "trending" | "foryou";
