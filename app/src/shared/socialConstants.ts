/** Shared limits for the Comunidade feed — used by both client and server. */
export const MAX_POST_BODY_LENGTH = 3000;
export const MAX_COMMENT_BODY_LENGTH = 1000;
export const MAX_TOPICS_PER_POST = 3;

export const SOCIAL_REACTION_TYPES = ['AMEM', 'REZO', 'ALELUIA'] as const;
export type SocialReactionType = (typeof SOCIAL_REACTION_TYPES)[number];
