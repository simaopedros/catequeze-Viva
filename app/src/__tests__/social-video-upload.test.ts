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

vi.mock("../server/social/publishGate", () => ({
  assertCanPublishSocial: vi.fn(async () => ({
    canPublish: true,
    plan: "catechist_single",
    source: "personal",
    limits: { maxPostsPerDay: 5, maxMediaPerPost: 4, maxVideoSeconds: 180 },
  })),
  assertMediaWithinPlan: vi.fn(),
}));

vi.mock("../server/storage/bunnyStream", () => ({
  isBunnyStreamConfigured: vi.fn(() => false),
  createBunnyVideoUpload: vi.fn(),
  deleteBunnyVideo: vi.fn(),
  buildBunnyEmbedUrl: (libraryId: string, videoId: string) =>
    `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`,
}));

vi.mock("../server/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  createBunnyVideoUpload,
  isBunnyStreamConfigured,
} from "../server/storage/bunnyStream";
import { MAX_SOCIAL_VIDEO_BYTES } from "../shared/socialConstants";

function mediaCtx() {
  const created: Record<string, unknown>[] = [];
  return {
    created,
    ctx: {
      user: { id: "user-1" },
      entities: {
        SocialMedia: {
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
            created.push(data);
            return { id: "media-1" };
          }),
        },
      },
    },
  };
}

describe("createSocialVideoUpload", () => {
  beforeEach(() => {
    vi.mocked(isBunnyStreamConfigured).mockReturnValue(false);
    vi.mocked(createBunnyVideoUpload).mockReset();
  });

  it("issues a server ticket when Bunny Stream is not configured", async () => {
    const { createSocialVideoUpload } = await import(
      "../server/operations/socialMediaOperations"
    );
    const { ctx, created } = mediaCtx();

    const result = await createSocialVideoUpload(
      { title: "clip.mp4", durationSeconds: 12 },
      ctx as any,
    );

    expect(result).toEqual({ transport: "server", mediaId: "media-1" });
    expect(created[0]).toMatchObject({
      uploaderId: "user-1",
      kind: "VIDEO",
      status: "PENDING",
      durationSeconds: 12,
    });
    expect(createBunnyVideoUpload).not.toHaveBeenCalled();
  });

  it("issues TUS credentials when Bunny Stream is configured", async () => {
    vi.mocked(isBunnyStreamConfigured).mockReturnValue(true);
    vi.mocked(createBunnyVideoUpload).mockResolvedValue({
      videoId: "vid-1",
      libraryId: "lib-1",
      tusEndpoint: "https://video.bunnycdn.com/tusupload",
      authorizationSignature: "sig",
      authorizationExpire: 99,
    } as any);

    const { createSocialVideoUpload } = await import(
      "../server/operations/socialMediaOperations"
    );
    const { ctx } = mediaCtx();

    const result = await createSocialVideoUpload(
      { title: "clip.mp4" },
      ctx as any,
    );

    expect(result).toMatchObject({
      transport: "stream",
      mediaId: "media-1",
      videoId: "vid-1",
      libraryId: "lib-1",
      tusEndpoint: "https://video.bunnycdn.com/tusupload",
      embedUrl: "https://iframe.mediadelivery.net/embed/lib-1/vid-1",
    });
  });
});

describe("social video size limit", () => {
  it("caps direct uploads at 60 MB", () => {
    expect(MAX_SOCIAL_VIDEO_BYTES).toBe(60 * 1024 * 1024);
  });
});
