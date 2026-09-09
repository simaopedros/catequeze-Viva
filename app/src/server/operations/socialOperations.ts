/**
 * Comunidade feed operations.
 *
 * Reads are intentionally open: the feed queries never require `context.user`,
 * so anonymous visitors get the same public feed as members. Writes go through
 * assertCanPublishSocial, which requires an active subscription.
 */
import { randomUUID } from "node:crypto";
import { HttpError } from "wasp/server";
import { MAX_TOPICS_PER_POST } from "../../shared/socialConstants";
import { buildSocialImageUrl } from "../storage/socialMediaStorage";
import { buildBunnyEmbedUrl } from "../storage/bunnyStream";
import {
  assertCanPublishSocial,
  assertMediaWithinPlan,
  resolveSocialEntitlement,
  startOfDayUtc,
} from "../social/publishGate";
import { notifySocialActivity } from "../social/notifications";
import { assertSocialEnabled, isSocialEnabled } from "../social/featureGate";
import { detachSocialMediaAsset } from "./socialMediaOperations";
import {
  buildSocialSlug,
  resolveInitialStatus,
  resolvePostKind,
  resolveVideoFormat,
  sanitizeSocialBody,
  socialRecommendationScore,
  validateSocialCommentDraft,
  validateSocialPostDraft,
} from "./socialPolicies";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
/** How far back the "trending" ranking looks. */
const TRENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Serialization ─────────────────────────────────────────────────────────

const PUBLIC_AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  socialHandle: true,
} as const;

const PUBLIC_MEDIA_SELECT = {
  id: true,
  kind: true,
  position: true,
  status: true,
  storageKey: true,
  bunnyVideoId: true,
  bunnyLibraryId: true,
  width: true,
  height: true,
  durationSeconds: true,
  thumbnailUrl: true,
  altText: true,
} as const;

export function buildAuthorDisplayName(author: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const name = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "Membro da Comunidade";
}

/** Display name of the acting user, for notification bodies. */
async function resolveActorName(context: any): Promise<string> {
  const actor = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { firstName: true, lastName: true },
  });
  return buildAuthorDisplayName(actor ?? {});
}

function serializeMedia(media: any) {
  return {
    id: media.id,
    kind: media.kind,
    position: media.position,
    status: media.status,
    altText: media.altText,
    width: media.width,
    height: media.height,
    durationSeconds: media.durationSeconds,
    thumbnailUrl: media.thumbnailUrl,
    imageUrl:
      media.kind === "IMAGE"
        ? buildSocialImageUrl(media.id, media.storageKey)
        : null,
    videoUrl:
      media.kind === "VIDEO" && media.storageKey
        ? buildSocialImageUrl(media.id, media.storageKey)
        : null,
    embedUrl:
      media.kind === "VIDEO" && media.bunnyLibraryId && media.bunnyVideoId
        ? buildBunnyEmbedUrl(media.bunnyLibraryId, media.bunnyVideoId)
        : null,
  };
}

export function serializePost(post: any, viewerId?: string | null) {
  return {
    id: post.id,
    slug: post.slug,
    kind: post.kind,
    status: post.status,
    body: post.body,
    createdAt: post.createdAt,
    publishedAt: post.publishedAt,
    reactionCount: post.reactionCount,
    commentCount: post.commentCount,
    shareCount: post.shareCount,
    author: {
      id: post.author.id,
      displayName: buildAuthorDisplayName(post.author),
      avatarUrl: post.author.avatarUrl,
      socialHandle: post.author.socialHandle ?? null,
    },
    parish: post.parish ? { id: post.parish.id, name: post.parish.name } : null,
    media: (post.media ?? []).map(serializeMedia),
    topics: (post.topics ?? []).map((link: any) => ({
      slug: link.topic.slug,
      name: link.topic.name,
    })),
    viewerReaction: viewerId ? post.reactions?.[0]?.type ?? null : null,
    isOwn: Boolean(viewerId && post.author.id === viewerId),
    videoFormat: post.videoFormat ?? null,
  };
}

function postInclude(viewerId?: string | null) {
  return {
    author: { select: PUBLIC_AUTHOR_SELECT },
    parish: { select: { id: true, name: true } },
    media: {
      select: PUBLIC_MEDIA_SELECT,
      orderBy: { position: "asc" as const },
    },
    topics: { select: { topic: { select: { slug: true, name: true } } } },
    ...(viewerId
      ? {
          reactions: {
            where: { userId: viewerId },
            select: { type: true },
            take: 1,
          },
        }
      : {}),
  };
}

// ─── Queries (public) ──────────────────────────────────────────────────────

/**
 * Public feed, newest first. Anonymous visitors are supported — `context.user`
 * only adds the viewer's own reaction to each item.
 */
export const getSocialFeed = async (
  args: {
    cursor?: string | null;
    limit?: number;
    topicSlug?: string | null;
    authorId?: string | null;
    /** `trending` ranks by engagement inside the trending window. */
    sort?: "recent" | "trending" | "foryou";
    /** Restrict to authors the viewer follows (ignored when anonymous). */
    following?: boolean;
    /** Restrict to Rhema shorts or long-form video posts. */
    videoFormat?: "SHORT" | "LONG" | null;
  },
  context: any,
) => {
  if (!isSocialEnabled()) return { items: [], nextCursor: null };

  const limit = Math.min(
    Math.max(args?.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const viewerId = context.user?.id ?? null;
  const trending = args?.sort === "trending";
  const foryou = args?.sort === "foryou";

  let followedAuthorIds: string[] | null = null;
  if (args?.following && viewerId) {
    const follows = await context.entities.SocialFollow.findMany({
      where: { followerId: viewerId },
      select: { authorId: true },
    });
    followedAuthorIds = follows.map((follow: any) => follow.authorId);
  }

  let watchedPostIds: string[] = [];
  if (foryou && viewerId) {
    const watches = await context.entities.SocialVideoWatch.findMany({
      where: { userId: viewerId },
      select: { postId: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    watchedPostIds = watches.map((watch: any) => watch.postId);
  }

  const where: any = {
    status: "PUBLISHED",
    ...(args?.topicSlug
      ? { topics: { some: { topic: { slug: args.topicSlug } } } }
      : {}),
    ...(args?.authorId ? { authorId: args.authorId } : {}),
    ...(followedAuthorIds ? { authorId: { in: followedAuthorIds } } : {}),
    ...(args?.videoFormat ? { videoFormat: args.videoFormat } : {}),
    ...(trending || (foryou && watchedPostIds.length === 0)
      ? { publishedAt: { gte: new Date(Date.now() - TRENDING_WINDOW_MS) } }
      : {}),
    ...(foryou && watchedPostIds.length > 0
      ? { id: { notIn: watchedPostIds } }
      : {}),
  };

  if (followedAuthorIds && followedAuthorIds.length === 0) {
    return { items: [], nextCursor: null };
  }

  if (foryou) {
    const windowSize = Math.min(MAX_PAGE_SIZE * 4, 80);
    const candidates = await context.entities.SocialPost.findMany({
      where,
      include: postInclude(viewerId),
      take: windowSize,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    });
    const ranked = [...candidates].sort((a: any, b: any) => {
      const delta = socialRecommendationScore(b) - socialRecommendationScore(a);
      return delta !== 0 ? delta : String(b.id).localeCompare(String(a.id));
    });
    let start = 0;
    if (args?.cursor) {
      const index = ranked.findIndex((post: any) => post.id === args.cursor);
      start = index >= 0 ? index + 1 : 0;
    }
    const page = ranked.slice(start, start + limit);
    return {
      items: page.map((post: any) => serializePost(post, viewerId)),
      nextCursor: ranked[start + limit]
        ? page[page.length - 1]?.id ?? null
        : null,
    };
  }

  const posts = await context.entities.SocialPost.findMany({
    where,
    include: postInclude(viewerId),
    orderBy: trending
      ? [
          { reactionCount: "desc" },
          { commentCount: "desc" },
          { shareCount: "desc" },
          { id: "desc" },
        ]
      : [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(args?.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  return {
    items: page.map((post: any) => serializePost(post, viewerId)),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
};

/** Single post by shareable slug. Authors and admins also see hidden posts. */
export const getSocialPost = async (args: { slug: string }, context: any) => {
  assertSocialEnabled();

  const viewerId = context.user?.id ?? null;

  const post = await context.entities.SocialPost.findUnique({
    where: { slug: String(args?.slug || "") },
    include: postInclude(viewerId),
  });

  if (!post) {
    throw new HttpError(404, "Publicação não encontrada.");
  }

  const isVisible =
    post.status === "PUBLISHED" ||
    post.author.id === viewerId ||
    context.user?.isAdmin;
  if (!isVisible) {
    throw new HttpError(404, "Publicação não encontrada.");
  }

  return serializePost(post, viewerId);
};

export const getSocialTopics = async (_args: unknown, context: any) => {
  if (!isSocialEnabled()) return [];

  const topics = await context.entities.SocialTopic.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { slug: true, name: true, nameEn: true, nameEs: true },
  });
  return topics;
};

export const getSocialCommunityPulse = async (_args: unknown, context: any) => {
  if (!isSocialEnabled()) {
    return { memberCount: 0, members: [], topics: [] };
  }

  const [authors, recent, topics] = await Promise.all([
    context.entities.SocialPost.findMany({
      where: { status: "PUBLISHED" },
      distinct: ["authorId"],
      select: { authorId: true },
    }),
    context.entities.SocialPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 24,
      select: { author: { select: PUBLIC_AUTHOR_SELECT } },
    }),
    context.entities.SocialTopic.findMany({
      where: { active: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        nameEn: true,
        nameEs: true,
        _count: { select: { posts: true } },
      },
    }),
  ]);

  const seen = new Set<string>();
  const members: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    socialHandle: string | null;
  }[] = [];

  for (const post of recent) {
    const author = post.author;
    if (!author || seen.has(author.id)) continue;
    seen.add(author.id);
    members.push({
      id: author.id,
      displayName: buildAuthorDisplayName(author),
      avatarUrl: author.avatarUrl ?? null,
      socialHandle: author.socialHandle ?? null,
    });
    if (members.length >= 6) break;
  }

  return {
    memberCount: authors.length,
    members,
    topics: topics.map((topic: any) => ({
      slug: topic.slug,
      name: topic.name,
      nameEn: topic.nameEn,
      nameEs: topic.nameEs,
      postCount: topic._count?.posts ?? 0,
    })),
  };
};

/** Comments of a published post, oldest first. Open to anonymous readers. */
export const getSocialComments = async (
  args: { postId: string; cursor?: string | null; limit?: number },
  context: any,
) => {
  assertSocialEnabled();

  const limit = Math.min(
    Math.max(args?.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const viewerId = context.user?.id ?? null;

  const post = await context.entities.SocialPost.findUnique({
    where: { id: String(args?.postId || "") },
    select: { id: true, status: true, authorId: true },
  });
  if (!post) {
    throw new HttpError(404, "Publicação não encontrada.");
  }
  if (
    post.status !== "PUBLISHED" &&
    post.authorId !== viewerId &&
    !context.user?.isAdmin
  ) {
    throw new HttpError(404, "Publicação não encontrada.");
  }

  const comments = await context.entities.SocialComment.findMany({
    where: { postId: post.id, status: "PUBLISHED" },
    include: { author: { select: PUBLIC_AUTHOR_SELECT } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(args?.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
  });

  const hasMore = comments.length > limit;
  const page = hasMore ? comments.slice(0, limit) : comments;

  return {
    items: page.map((comment: any) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      author: {
        id: comment.author.id,
        displayName: buildAuthorDisplayName(comment.author),
        avatarUrl: comment.author.avatarUrl,
      },
      isOwn: Boolean(viewerId && comment.author.id === viewerId),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
};

/**
 * What the current viewer may do in the feed. Drives the composer and the
 * upsell — never throws, so the page renders for free users too.
 */
export const getSocialPublishAccess = async (_args: unknown, context: any) => {
  if (!isSocialEnabled()) {
    return {
      authenticated: false,
      canPublish: false,
      plan: "catechist_free",
      reason: null,
    };
  }

  if (!context.user) {
    return {
      authenticated: false,
      canPublish: false,
      plan: "catechist_free",
      reason: "anonymous",
    };
  }

  const entitlement = await resolveSocialEntitlement(context, context.user.id);

  const banned = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { socialBannedAt: true },
  });

  const postsToday = await context.entities.SocialPost.count({
    where: { authorId: context.user.id, createdAt: { gte: startOfDayUtc() } },
  });

  const quotaLeft =
    entitlement.limits.maxPostsPerDay === null
      ? null
      : Math.max(0, entitlement.limits.maxPostsPerDay - postsToday);

  return {
    authenticated: true,
    canPublish:
      entitlement.canPublish && !banned?.socialBannedAt && quotaLeft !== 0,
    banned: Boolean(banned?.socialBannedAt),
    plan: entitlement.plan,
    source: entitlement.source,
    limits: entitlement.limits,
    postsToday,
    quotaLeft,
    reason: !entitlement.canPublish
      ? "subscription"
      : banned?.socialBannedAt
        ? "banned"
        : quotaLeft === 0
          ? "quota"
          : null,
  };
};

// ─── Actions (subscription-gated) ──────────────────────────────────────────

export const createSocialPost = async (
  args: {
    body: string;
    mediaIds?: string[];
    topicSlugs?: string[];
    mediaConsentAck?: boolean;
    parishId?: string | null;
  },
  context: any,
) => {
  const entitlement = await assertCanPublishSocial(context);

  const mediaIds = Array.isArray(args.mediaIds)
    ? [...new Set(args.mediaIds)]
    : [];
  const body = sanitizeSocialBody(args.body || "");

  const validationError = validateSocialPostDraft({
    body,
    mediaCount: mediaIds.length,
    mediaConsentAck: Boolean(args.mediaConsentAck),
  });
  if (validationError) {
    throw new HttpError(400, validationError);
  }

  const media = mediaIds.length
    ? await context.entities.SocialMedia.findMany({
        where: {
          id: { in: mediaIds },
          uploaderId: context.user.id,
          postId: null,
        },
        select: { id: true, kind: true, status: true, durationSeconds: true },
      })
    : [];

  if (media.length !== mediaIds.length) {
    throw new HttpError(
      400,
      "Alguma mídia não está disponível. Envie novamente.",
    );
  }
  if (media.some((item: any) => item.status === "FAILED")) {
    throw new HttpError(
      400,
      "Uma das mídias falhou no processamento. Remova-a e tente de novo.",
    );
  }

  assertMediaWithinPlan(entitlement, media as any);

  const topicSlugs = Array.isArray(args.topicSlugs)
    ? args.topicSlugs.slice(0, MAX_TOPICS_PER_POST)
    : [];
  const topics = topicSlugs.length
    ? await context.entities.SocialTopic.findMany({
        where: { slug: { in: topicSlugs }, active: true },
        select: { id: true },
      })
    : [];

  // Only credit a workspace the author actually belongs to.
  let parishId: string | null = null;
  if (args.parishId) {
    const membership = await context.entities.Membership.findFirst({
      where: {
        userId: context.user.id,
        parishId: args.parishId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (membership) parishId = args.parishId;
  }

  const { status } = resolveInitialStatus(body);
  const slug = buildSocialSlug(body, randomUUID().slice(0, 8));

  const post = await context.entities.SocialPost.create({
    data: {
      slug,
      authorId: context.user.id,
      parishId,
      body,
      kind: resolvePostKind(media as any),
      videoFormat: resolveVideoFormat(media as any),
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      mediaConsentAckAt: mediaIds.length ? new Date() : null,
      topics: topics.length
        ? { create: topics.map((topic: any) => ({ topicId: topic.id })) }
        : undefined,
    },
    select: { id: true, slug: true, status: true },
  });

  if (mediaIds.length) {
    await Promise.all(
      mediaIds.map((mediaId, index) =>
        context.entities.SocialMedia.update({
          where: { id: mediaId },
          data: { postId: post.id, position: index },
        }),
      ),
    );
  }

  return { id: post.id, slug: post.slug, status: post.status };
};

export const deleteSocialPost = async (
  args: { postId: string },
  context: any,
) => {
  assertSocialEnabled();

  if (!context.user) {
    throw new HttpError(401, "Você precisa estar autenticado.");
  }

  const post = await context.entities.SocialPost.findUnique({
    where: { id: String(args?.postId || "") },
    select: {
      id: true,
      authorId: true,
      media: {
        select: { id: true, kind: true, storageKey: true, bunnyVideoId: true },
      },
    },
  });

  if (!post) {
    throw new HttpError(404, "Publicação não encontrada.");
  }
  if (post.authorId !== context.user.id && !context.user.isAdmin) {
    throw new HttpError(403, "Você só pode remover as suas publicações.");
  }

  for (const media of post.media) {
    await detachSocialMediaAsset(media);
  }

  await context.entities.SocialPost.delete({ where: { id: post.id } });

  return { success: true };
};

export const toggleSocialReaction = async (
  args: { postId: string; type?: "AMEM" | "REZO" | "ALELUIA" },
  context: any,
) => {
  await assertCanPublishSocial(context, { skipQuota: true });

  const post = await context.entities.SocialPost.findUnique({
    where: { id: String(args?.postId || "") },
    select: { id: true, status: true, slug: true, authorId: true },
  });
  if (!post || post.status !== "PUBLISHED") {
    throw new HttpError(404, "Publicação não encontrada.");
  }

  const type = args.type || "AMEM";
  const existing = await context.entities.SocialReaction.findUnique({
    where: { postId_userId: { postId: post.id, userId: context.user.id } },
    select: { id: true, type: true },
  });

  if (existing && existing.type === type) {
    await context.entities.SocialReaction.delete({
      where: { id: existing.id },
    });
    const updated = await context.entities.SocialPost.update({
      where: { id: post.id },
      data: { reactionCount: { decrement: 1 } },
      select: { reactionCount: true },
    });
    return {
      reaction: null,
      reactionCount: Math.max(0, updated.reactionCount),
    };
  }

  if (existing) {
    await context.entities.SocialReaction.update({
      where: { id: existing.id },
      data: { type },
    });
    const current = await context.entities.SocialPost.findUnique({
      where: { id: post.id },
      select: { reactionCount: true },
    });
    return { reaction: type, reactionCount: current.reactionCount };
  }

  await context.entities.SocialReaction.create({
    data: { postId: post.id, userId: context.user.id, type },
  });
  const updated = await context.entities.SocialPost.update({
    where: { id: post.id },
    data: { reactionCount: { increment: 1 } },
    select: { reactionCount: true },
  });

  await notifySocialActivity(context, {
    recipientId: post.authorId,
    actorName: await resolveActorName(context),
    event: "REACTION",
    postId: post.id,
    postSlug: post.slug,
  });

  return { reaction: type, reactionCount: updated.reactionCount };
};

export const createSocialComment = async (
  args: { postId: string; body: string; parentId?: string | null },
  context: any,
) => {
  await assertCanPublishSocial(context, { skipQuota: true });

  const post = await context.entities.SocialPost.findUnique({
    where: { id: String(args?.postId || "") },
    select: { id: true, status: true, slug: true, authorId: true },
  });
  if (!post || post.status !== "PUBLISHED") {
    throw new HttpError(404, "Publicação não encontrada.");
  }

  const body = sanitizeSocialBody(args.body || "");
  const validationError = validateSocialCommentDraft(body);
  if (validationError) {
    throw new HttpError(400, validationError);
  }

  if (args.parentId) {
    const parent = await context.entities.SocialComment.findUnique({
      where: { id: args.parentId },
      select: { id: true, postId: true },
    });
    if (!parent || parent.postId !== post.id) {
      throw new HttpError(400, "Comentário original não encontrado.");
    }
  }

  const { status } = resolveInitialStatus(body);

  const comment = await context.entities.SocialComment.create({
    data: {
      postId: post.id,
      authorId: context.user.id,
      parentId: args.parentId || null,
      body,
      // Flagged comments are hidden until a moderator reviews them.
      status: status === "PUBLISHED" ? "PUBLISHED" : "REMOVED",
      ...(status === "PUBLISHED"
        ? {}
        : { removedAt: new Date(), removalReason: "Triagem automática" }),
    },
    select: { id: true, status: true },
  });

  if (comment.status === "PUBLISHED") {
    await context.entities.SocialPost.update({
      where: { id: post.id },
      data: { commentCount: { increment: 1 } },
    });

    await notifySocialActivity(context, {
      recipientId: post.authorId,
      actorName: await resolveActorName(context),
      event: "COMMENT",
      postId: post.id,
      postSlug: post.slug,
      excerpt: body,
    });
  }

  return { id: comment.id, held: comment.status !== "PUBLISHED" };
};

/**
 * Best-effort share counter. Open to anonymous visitors, since sharing is one
 * of the things that does not require an account.
 */
export const registerSocialShare = async (
  args: { postId: string },
  context: any,
) => {
  if (!isSocialEnabled()) return { success: true };

  const post = await context.entities.SocialPost.findUnique({
    where: { id: String(args?.postId || "") },
    select: { id: true, status: true },
  });
  if (!post || post.status !== "PUBLISHED") {
    // Never leak whether a hidden post exists.
    return { success: true };
  }

  const updated = await context.entities.SocialPost.update({
    where: { id: post.id },
    data: { shareCount: { increment: 1 } },
    select: { shareCount: true },
  });

  return { success: true, shareCount: updated.shareCount };
};

export const deleteSocialComment = async (
  args: { commentId: string },
  context: any,
) => {
  assertSocialEnabled();

  if (!context.user) {
    throw new HttpError(401, "Você precisa estar autenticado.");
  }

  const comment = await context.entities.SocialComment.findUnique({
    where: { id: String(args?.commentId || "") },
    select: { id: true, authorId: true, postId: true, status: true },
  });
  if (!comment) {
    throw new HttpError(404, "Comentário não encontrado.");
  }
  if (comment.authorId !== context.user.id && !context.user.isAdmin) {
    throw new HttpError(403, "Você só pode remover os seus comentários.");
  }

  await context.entities.SocialComment.delete({ where: { id: comment.id } });

  if (comment.status === "PUBLISHED") {
    await context.entities.SocialPost.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });
  }

  return { success: true };
};

export const recordSocialWatch = async (
  args: {
    postId: string;
    watchSeconds?: number;
    completionRate?: number | null;
  },
  context: any,
) => {
  assertSocialEnabled();

  if (!context.user) {
    throw new HttpError(401, "Você precisa estar autenticado.");
  }

  const postId = String(args?.postId || "");
  if (!postId) {
    throw new HttpError(400, "Publicação inválida.");
  }

  const post = await context.entities.SocialPost.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });
  if (!post || post.status !== "PUBLISHED") {
    throw new HttpError(404, "Publicação não encontrada.");
  }

  const watchSeconds = Math.max(0, Math.floor(Number(args?.watchSeconds) || 0));
  const completionRate =
    args?.completionRate == null
      ? null
      : Math.min(1, Math.max(0, Number(args.completionRate)));

  const existing = await context.entities.SocialVideoWatch.findUnique({
    where: { userId_postId: { userId: context.user.id, postId } },
    select: { id: true, watchSeconds: true, completionRate: true },
  });

  if (!existing) {
    await context.entities.SocialVideoWatch.create({
      data: {
        userId: context.user.id,
        postId,
        watchSeconds,
        completionRate,
      },
    });
    await context.entities.SocialPost.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });
    return { created: true };
  }

  await context.entities.SocialVideoWatch.update({
    where: { id: existing.id },
    data: {
      watchSeconds: Math.max(existing.watchSeconds, watchSeconds),
      completionRate:
        completionRate == null
          ? existing.completionRate
          : Math.max(existing.completionRate ?? 0, completionRate),
    },
  });

  return { created: false };
};
