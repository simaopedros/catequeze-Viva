import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  env: {},
}));

vi.mock("../server/social/featureGate", () => ({
  SOCIAL_FEATURES_ENABLED: true,
  isSocialEnabled: () => true,
  assertSocialEnabled: () => {},
}));

vi.mock("../server/social/notifications", () => ({
  notifySocialActivity: vi.fn(async () => {}),
}));

function fakePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-1",
    slug: "paz-abc",
    kind: "TEXT",
    status: "PUBLISHED",
    body: "Paz e bem",
    createdAt: new Date("2026-09-01T12:00:00Z"),
    publishedAt: new Date("2026-09-01T12:00:00Z"),
    reactionCount: 0,
    commentCount: 0,
    shareCount: 0,
    viewCount: 0,
    videoFormat: null,
    author: {
      id: "author-1",
      firstName: "Ana",
      lastName: "Silva",
      avatarUrl: null,
      socialHandle: "ana",
    },
    parish: null,
    media: [],
    topics: [],
    ...overrides,
  };
}

function makeCtx(
  options: {
    user?: { id: string } | null;
    handleTaken?: boolean;
    profile?: any;
    posts?: any[];
    people?: any[];
    existingWatch?: any;
    existingFollow?: any;
    watchedPostIds?: string[];
  } = {},
) {
  const updatedUsers: any[] = [];
  const createdWatches: any[] = [];
  const createdFollows: any[] = [];
  const deletedFollows: any[] = [];
  const updatedPosts: any[] = [];
  const feedQueries: any[] = [];

  const ctx = {
    user: options.user === undefined ? { id: "user-1" } : options.user,
    entities: {
      User: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.id === "author-1" || where.socialHandle === "ana") {
            return (
              options.profile ?? {
                id: "author-1",
                firstName: "Ana",
                lastName: "Silva",
                avatarUrl: null,
                socialHandle: "ana",
                socialBio: "Catequista",
                socialFollowersCount: 2,
                socialFollowingCount: 1,
              }
            );
          }
          if (where.id === "user-1") {
            return { id: "user-1", firstName: "João", lastName: "Lima" };
          }
          return null;
        }),
        findFirst: vi.fn(async () =>
          options.handleTaken ? { id: "other" } : null,
        ),
        findMany: vi.fn(async () => options.people ?? []),
        update: vi.fn(async (args: any) => {
          updatedUsers.push(args);
          return { id: args.where.id, ...args.data };
        }),
      },
      SocialFollow: {
        findUnique: vi.fn(async () => options.existingFollow ?? null),
        findMany: vi.fn(async () => []),
        create: vi.fn(async (args: any) => {
          createdFollows.push(args.data);
          return { id: "follow-1", ...args.data };
        }),
        delete: vi.fn(async (args: any) => {
          deletedFollows.push(args);
          return { id: args.where.id };
        }),
      },
      SocialPost: {
        findUnique: vi.fn(async () => ({ id: "post-1", status: "PUBLISHED" })),
        findMany: vi.fn(async (args: any) => {
          feedQueries.push(args);
          return options.posts ?? [];
        }),
        update: vi.fn(async (args: any) => {
          updatedPosts.push(args);
          return { id: "post-1" };
        }),
      },
      SocialVideoWatch: {
        findUnique: vi.fn(async () => options.existingWatch ?? null),
        findMany: vi.fn(async () =>
          (options.watchedPostIds ?? []).map((postId) => ({ postId })),
        ),
        create: vi.fn(async (args: any) => {
          createdWatches.push(args.data);
          return { id: "watch-1" };
        }),
        update: vi.fn(async () => ({ id: "watch-1" })),
      },
    },
  };

  return {
    ctx,
    updatedUsers,
    createdWatches,
    createdFollows,
    deletedFollows,
    updatedPosts,
    feedQueries,
  };
}

describe("updateSocialProfile", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("normalises and saves a handle", async () => {
    const { updateSocialProfile } = await import(
      "../server/operations/socialDiscoveryOperations"
    );
    const { ctx, updatedUsers } = makeCtx();

    const result = await updateSocialProfile(
      { socialHandle: "@Ana_Catequista" },
      ctx as any,
    );

    expect(updatedUsers[0].data.socialHandle).toBe("ana_catequista");
    expect(result.socialHandle).toBe("ana_catequista");
  });

  it("rejects a taken handle", async () => {
    const { updateSocialProfile } = await import(
      "../server/operations/socialDiscoveryOperations"
    );
    const { ctx } = makeCtx({ handleTaken: true });

    await expect(
      updateSocialProfile({ socialHandle: "ana" }, ctx as any),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("getSocialProfile", () => {
  it("returns 404 when the handle does not exist", async () => {
    const { getSocialProfile } = await import(
      "../server/operations/socialDiscoveryOperations"
    );
    const { ctx } = makeCtx({ profile: null });
    ctx.entities.User.findUnique = vi.fn(async () => null);

    await expect(
      getSocialProfile({ handle: "ninguem" }, ctx as any),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("returns profile metadata and follow state", async () => {
    const { getSocialProfile } = await import(
      "../server/operations/socialDiscoveryOperations"
    );
    const { ctx } = makeCtx({ existingFollow: { id: "follow-1" } });

    const result = await getSocialProfile({ handle: "@Ana" }, ctx as any);

    expect(result.profile.socialHandle).toBe("ana");
    expect(result.profile.displayName).toBe("Ana Silva");
    expect(result.profile.followersCount).toBe(2);
    expect(result.isFollowing).toBe(true);
    expect(ctx.entities.SocialPost.findMany).not.toHaveBeenCalled();
  });
});

describe("searchSocial", () => {
  it("returns empty for short queries without touching the database", async () => {
    const { searchSocial } = await import(
      "../server/operations/socialDiscoveryOperations"
    );
    const { ctx } = makeCtx();

    const result = await searchSocial({ q: "a" }, ctx as any);
    expect(result).toEqual({ people: [], posts: [] });
    expect(ctx.entities.User.findMany).not.toHaveBeenCalled();
  });

  it("searches people by handle and posts by body", async () => {
    const { searchSocial } = await import(
      "../server/operations/socialDiscoveryOperations"
    );
    const { ctx } = makeCtx({
      people: [
        {
          id: "author-1",
          firstName: "Ana",
          lastName: "Silva",
          avatarUrl: null,
          socialHandle: "ana",
          socialFollowersCount: 2,
        },
      ],
      posts: [fakePost()],
    });

    const result = await searchSocial({ q: "ana" }, ctx as any);

    expect(result.people[0]).toMatchObject({
      displayName: "Ana Silva",
      socialHandle: "ana",
      followersCount: 2,
    });
    expect(result.posts[0].slug).toBe("paz-abc");
    expect(ctx.entities.User.findMany).toHaveBeenCalled();
  });
});

describe("recordSocialWatch", () => {
  it("creates a watch and increments viewCount the first time", async () => {
    const { recordSocialWatch } = await import(
      "../server/operations/socialOperations"
    );
    const { ctx, createdWatches, updatedPosts } = makeCtx();

    const result = await recordSocialWatch(
      { postId: "post-1", watchSeconds: 4 },
      ctx as any,
    );

    expect(result.created).toBe(true);
    expect(createdWatches).toHaveLength(1);
    expect(updatedPosts[0].data.viewCount).toEqual({ increment: 1 });
  });

  it("updates elapsed time on a repeat watch", async () => {
    const { recordSocialWatch } = await import(
      "../server/operations/socialOperations"
    );
    const { ctx, createdWatches } = makeCtx({
      existingWatch: { id: "watch-1", watchSeconds: 2, completionRate: 0.1 },
    });

    const result = await recordSocialWatch(
      { postId: "post-1", watchSeconds: 9 },
      ctx as any,
    );

    expect(result.created).toBe(false);
    expect(createdWatches).toHaveLength(0);
  });
});

describe("toggleSocialFollow counters", () => {
  it("increments follower counters when following", async () => {
    const { toggleSocialFollow } = await import(
      "../server/operations/socialDiscoveryOperations"
    );
    const { ctx, updatedUsers, createdFollows } = makeCtx({
      existingFollow: null,
    });

    const result = await toggleSocialFollow(
      { authorId: "author-1" },
      ctx as any,
    );

    expect(result.following).toBe(true);
    expect(createdFollows).toHaveLength(1);
    expect(updatedUsers.some((row) => row.data.socialFollowersCount)).toBe(
      true,
    );
  });
});

describe("getSocialFeed foryou ranking", () => {
  it("ranks by recommendation score and excludes watched posts", async () => {
    const { getSocialFeed } = await import(
      "../server/operations/socialOperations"
    );
    const quiet = fakePost({
      id: "quiet",
      reactionCount: 0,
      commentCount: 0,
      shareCount: 0,
      viewCount: 1,
    });
    const loud = fakePost({
      id: "loud",
      reactionCount: 3,
      commentCount: 1,
      shareCount: 1,
      viewCount: 2,
    });
    const { ctx, feedQueries } = makeCtx({
      posts: [quiet, loud],
      watchedPostIds: ["seen-1"],
    });

    const result = await getSocialFeed(
      { sort: "foryou", limit: 10 },
      ctx as any,
    );

    expect(feedQueries[0].where.id).toEqual({ notIn: ["seen-1"] });
    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      "loud",
      "quiet",
    ]);
  });
});

describe("serializePost media URLs", () => {
  it("exposes videoUrl for stored videos without a Stream embed", async () => {
    delete process.env.BUNNY_CDN_HOSTNAME;
    const { serializePost } = await import(
      "../server/operations/socialOperations"
    );

    const post = serializePost(
      fakePost({
        kind: "VIDEO",
        videoFormat: "SHORT",
        media: [
          {
            id: "media-v",
            kind: "VIDEO",
            position: 0,
            status: "READY",
            storageKey: "social/clip.mp4",
            bunnyVideoId: null,
            bunnyLibraryId: null,
            width: null,
            height: null,
            durationSeconds: 12,
            thumbnailUrl: null,
            altText: null,
          },
        ],
      }),
    );

    expect(post.media[0].videoUrl).toBe("/api/social/media/media-v");
    expect(post.media[0].embedUrl).toBeNull();
  });
});

describe("social appearance helpers", () => {
  it("builds initials from the display name", async () => {
    const { socialAuthorInitials } = await import(
      "../catequese/components/social/socialAppearance"
    );
    expect(socialAuthorInitials("Maria Silva")).toBe("MS");
    expect(socialAuthorInitials("")).toBe("CV");
  });

  it("uses the first line as a title when the body continues", async () => {
    const { splitSocialHeadline } = await import(
      "../catequese/components/social/socialAppearance"
    );
    expect(
      splitSocialHeadline(
        "Como vocês organizam os encontros?\nUma dinâmica que tem dado certo.",
      ),
    ).toEqual({
      title: "Como vocês organizam os encontros?",
      rest: "Uma dinâmica que tem dado certo.",
    });
    expect(splitSocialHeadline("Só um parágrafo.")).toEqual({
      title: null,
      rest: "Só um parágrafo.",
    });
  });

  it("maps prayer topics to the green tone", async () => {
    const { socialTopicTone } = await import(
      "../catequese/components/social/socialAppearance"
    );
    expect(socialTopicTone("oracao")).toBe("green");
    expect(socialTopicTone("testemunho")).toBe("gold");
  });
});

describe("getSocialCommunityPulse", () => {
  it("counts distinct authors and popular topics", async () => {
    const { getSocialCommunityPulse } = await import(
      "../server/operations/socialOperations"
    );

    const ctx = {
      user: null,
      entities: {
        SocialPost: {
          findMany: vi.fn(async (args: any) => {
            if (args.distinct) return [{ authorId: "a" }, { authorId: "b" }];
            return [
              {
                author: {
                  id: "author-1",
                  firstName: "Ana",
                  lastName: "Silva",
                  avatarUrl: null,
                  socialHandle: "ana",
                },
              },
              {
                author: {
                  id: "author-1",
                  firstName: "Ana",
                  lastName: "Silva",
                  avatarUrl: null,
                  socialHandle: "ana",
                },
              },
            ];
          }),
        },
        SocialTopic: {
          findMany: vi.fn(async () => [
            {
              slug: "oracao",
              name: "Oração",
              nameEn: "Prayer",
              nameEs: "Oración",
              _count: { posts: 4 },
            },
          ]),
        },
      },
    };

    const result = await getSocialCommunityPulse(undefined, ctx as any);
    expect(result.memberCount).toBe(2);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].socialHandle).toBe("ana");
    expect(result.topics[0]).toMatchObject({ slug: "oracao", postCount: 4 });
  });
});
