export type MobileUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  locale: string | null;
  timezone: string | null;
  isAdmin: boolean;
};

export type AuthPayload = {
  authenticated: boolean;
  sessionId?: string;
  user?: MobileUser | null;
  requiresTwoFactor?: boolean;
  twoFactor?: { enabled: boolean; sessionVerified: boolean };
  bootstrap?: BootstrapPayload;
  suspended?: boolean;
  success?: boolean;
};

export type Workspace = {
  id: string;
  name: string;
  type?: string;
};

export type BootstrapPayload = {
  currentUserContext?: unknown;
  workspaces?: Workspace[];
  unreadNotifications?: number | { count?: number };
};

export type SocialAuthor = {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
  socialHandle?: string | null;
};

export type SocialShare = {
  kind: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  href: string;
  sourceId: string | null;
  sourceLabel: string | null;
};

export type SocialPost = {
  id: string;
  slug: string;
  kind?: string;
  body: string;
  createdAt?: string;
  publishedAt?: string | null;
  reactionCount?: number;
  commentCount?: number;
  shareCount?: number;
  author: SocialAuthor;
  share?: SocialShare | null;
  topics?: { slug: string; name: string }[];
  media?: { id: string; kind?: string; url?: string | null }[];
  isOwn?: boolean;
};

export type SocialFeed = {
  items: SocialPost[];
  nextCursor: string | null;
};

export type SocialAccess = {
  authenticated: boolean;
  canPublish: boolean;
  plan?: string;
  reason?: string | null;
  banned?: boolean;
  quotaLeft?: number | null;
};

export type SocialTopic = {
  slug: string;
  name: string;
  nameEn?: string | null;
  nameEs?: string | null;
};

export type SocialProfile = {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  followerCount?: number;
  followingCount?: number;
  followersCount?: number;
  postCount?: number;
  isOwn?: boolean;
  isFollowing?: boolean;
  isBlocked?: boolean;
  profile?: SocialProfile;
};

export type BibleBook = {
  id: string;
  name: string;
  testament?: string;
  position?: number;
  abbreviation?: string | null;
  _count?: { chapters?: number };
  chapters?: { id: string; number: number }[];
};

export type BibleVerse = {
  id?: string;
  number: number;
  text: string;
};

export type BibleChapter = {
  id?: string;
  number: number;
  book?: { id: string; name: string };
  verses: BibleVerse[];
};
