import { describe, expect, it } from "vitest";
import {
  SOCIAL_INVITE_COOLDOWN_MS,
  SOCIAL_INVITE_STORAGE_KEY,
  buildSocialInviteUrl,
  buildSocialInviteWhatsappHref,
  isSociallyLonely,
  readSocialInviteDismissedAt,
  shouldShowSocialInvitePrompt,
  writeSocialInviteDismissedAt,
  type InvitePromptStorage,
} from "../shared/socialInvitePrompt";

function memoryStorage(initial?: Record<string, string>): InvitePromptStorage {
  const data = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key) => (data.has(key) ? data.get(key)! : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("isSociallyLonely", () => {
  it("is true when there are no followers and nobody is being followed", () => {
    expect(isSociallyLonely({})).toBe(true);
    expect(isSociallyLonely({ followerCount: 0, followingCount: 0 })).toBe(
      true,
    );
    expect(
      isSociallyLonely({ followerCount: null, followingCount: null }),
    ).toBe(true);
  });

  it("is false as soon as there is a follower or someone being followed", () => {
    expect(isSociallyLonely({ followerCount: 1, followingCount: 0 })).toBe(
      false,
    );
    expect(isSociallyLonely({ followerCount: 0, followingCount: 2 })).toBe(
      false,
    );
  });
});

describe("shouldShowSocialInvitePrompt", () => {
  const now = 1_700_000_000_000;

  it("shows on the first visit while lonely", () => {
    expect(
      shouldShowSocialInvitePrompt({
        lonely: true,
        dismissedAt: null,
        now,
      }),
    ).toBe(true);
  });

  it("hides during the 2-day cooldown", () => {
    expect(
      shouldShowSocialInvitePrompt({
        lonely: true,
        dismissedAt: now - SOCIAL_INVITE_COOLDOWN_MS + 1,
        now,
      }),
    ).toBe(false);
  });

  it("returns after two days if the person is still lonely", () => {
    expect(
      shouldShowSocialInvitePrompt({
        lonely: true,
        dismissedAt: now - SOCIAL_INVITE_COOLDOWN_MS,
        now,
      }),
    ).toBe(true);
  });

  it("never shows once the person has a connection", () => {
    expect(
      shouldShowSocialInvitePrompt({
        lonely: false,
        dismissedAt: null,
        now,
      }),
    ).toBe(false);
  });
});

describe("buildSocialInviteUrl", () => {
  it("uses the public profile path when a handle exists", () => {
    expect(
      buildSocialInviteUrl({
        origin: "https://catechis.app/",
        handle: "Ana_Catequista",
      }),
    ).toBe("https://catechis.app/u/ana_catequista");
  });

  it("falls back to the public community feed without a handle", () => {
    expect(
      buildSocialInviteUrl({
        origin: "https://catechis.app",
        handle: null,
      }),
    ).toBe("https://catechis.app/comunidade");
  });
});

describe("buildSocialInviteWhatsappHref", () => {
  it("encodes the invite message and url", () => {
    expect(
      buildSocialInviteWhatsappHref(
        "Venha participar da Comunidade comigo:",
        "https://catechis.app/u/ana",
      ),
    ).toBe(
      "https://wa.me/?text=" +
        encodeURIComponent(
          "Venha participar da Comunidade comigo:\nhttps://catechis.app/u/ana",
        ),
    );
  });
});

describe("invite prompt storage", () => {
  it("reads a stored timestamp", () => {
    const storage = memoryStorage({
      [SOCIAL_INVITE_STORAGE_KEY]: JSON.stringify({ timestamp: 42 }),
    });
    expect(readSocialInviteDismissedAt(storage)).toBe(42);
  });

  it("treats missing or invalid values as a first visit", () => {
    expect(readSocialInviteDismissedAt(memoryStorage())).toBe(null);
    expect(
      readSocialInviteDismissedAt(
        memoryStorage({ [SOCIAL_INVITE_STORAGE_KEY]: "not-json" }),
      ),
    ).toBe(null);
    expect(readSocialInviteDismissedAt(null)).toBe(null);
  });

  it("writes the cooldown timestamp", () => {
    const storage = memoryStorage();
    expect(writeSocialInviteDismissedAt(99, storage)).toBe(99);
    expect(storage.getItem(SOCIAL_INVITE_STORAGE_KEY)).toBe(
      JSON.stringify({ timestamp: 99 }),
    );
    expect(readSocialInviteDismissedAt(storage)).toBe(99);
  });
});
