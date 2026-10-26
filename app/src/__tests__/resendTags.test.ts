import { beforeEach, describe, expect, it, vi } from "vitest";

const resendMock = vi.hoisted(() => ({
  send: vi.fn(async () => ({ data: { id: "msg_1" }, error: null })),
  batchSend: vi.fn(async () => ({ data: { data: [{ id: "msg_1" }, { id: "msg_2" }] }, error: null })),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendMock.send };
    batch = { send: resendMock.batchSend };
  },
}));
vi.mock("../server/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import {
  RESEND_TAG_MAX_LENGTH,
  sanitizeResendTagPart,
  sanitizeResendTags,
} from "../server/email/resendTags";
import { resendEmailAdapter } from "../server/email/adapters/resend";

const VALID = /^[A-Za-z0-9_-]+$/;

describe("sanitizeResendTagPart", () => {
  it("replaces dots with underscores", () => {
    expect(sanitizeResendTagPart("lifecycle.welcome")).toBe("lifecycle_welcome");
  });

  it("strips accents and other characters", () => {
    expect(sanitizeResendTagPart("Confirmação de inscrição!")).toBe(
      "Confirmacao_de_inscricao",
    );
    expect(sanitizeResendTagPart("família/portal:convite")).toBe("familiaportalconvite");
    expect(sanitizeResendTagPart("a..b  c")).toBe("a_b_c");
    expect(sanitizeResendTagPart("keep-dash_and_underscore")).toBe(
      "keep-dash_and_underscore",
    );
  });

  it("caps the length", () => {
    const out = sanitizeResendTagPart("x".repeat(400));
    expect(out).toHaveLength(RESEND_TAG_MAX_LENGTH);
  });
});

describe("sanitizeResendTags", () => {
  it("only emits names and values Resend accepts", () => {
    const tags = sanitizeResendTags({
      messageId: "lifecycle.welcome",
      stream: "lifecycle",
      "campanha.mês": "Promoção de Natal 🎄",
    });
    expect(tags).toEqual([
      { name: "messageId", value: "lifecycle_welcome" },
      { name: "stream", value: "lifecycle" },
      { name: "campanha_mes", value: "Promocao_de_Natal" },
    ]);
    for (const tag of tags ?? []) {
      expect(tag.name).toMatch(VALID);
      expect(tag.value).toMatch(VALID);
    }
  });

  it("drops empty tags and duplicate names after sanitizing", () => {
    expect(
      sanitizeResendTags({ "a.b": "1", a_b: "2", "🎄": "x", empty: "" }),
    ).toEqual([{ name: "a_b", value: "1" }]);
    expect(sanitizeResendTags({ "!!!": "???" })).toBeUndefined();
    expect(sanitizeResendTags(undefined)).toBeUndefined();
  });
});

describe("resendEmailAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test";
  });

  const base = {
    to: "ana@example.com",
    from: { name: "Catequese Viva", email: "ola@catechis.app" },
    subject: "Bem-vinda",
    html: "<p>oi</p>",
    text: "oi",
  };

  it("sanitizes tags on single sends", async () => {
    await resendEmailAdapter.send({
      ...base,
      tags: { messageId: "lifecycle.welcome", stream: "lifecycle" },
    } as any);
    expect(resendMock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [
          { name: "messageId", value: "lifecycle_welcome" },
          { name: "stream", value: "lifecycle" },
        ],
      }),
    );
  });

  it("sanitizes tags on batch sends", async () => {
    await resendEmailAdapter.sendBatch([
      { ...base, tags: { messageId: "transactional.invite" } },
      { ...base, tags: { messageId: "lifecycle.trial_ending" } },
    ] as any);
    const payload = (resendMock.batchSend.mock.calls[0] as unknown[])[0] as Array<{
      tags: unknown;
    }>;
    expect(payload.map((item) => item.tags)).toEqual([
      [{ name: "messageId", value: "transactional_invite" }],
      [{ name: "messageId", value: "lifecycle_trial_ending" }],
    ]);
  });
});
