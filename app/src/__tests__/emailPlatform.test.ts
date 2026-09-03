import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("wasp/server/auth", () => ({}));
vi.mock("../server/requestPortalContext", () => ({
  isFamilyPortalRequestContext: () => false,
}));

import {
  EMAIL_MESSAGE,
  EMAIL_STREAM,
  EMAIL_TOPIC,
  PRODUCT_EVENT,
  streamForMessage,
  topicForMessage,
} from "../shared/emailCatalog";
import {
  enqueueEmail,
  emitProductEvent,
  getFakeBroadcasts,
  getFakeContacts,
  getFakeEvents,
  getFakeSentEmails,
  processEmailOutbox,
  resetEmailMemory,
  resetFakeEmailAdapter,
  enqueueProductBroadcast,
} from "../server/email";
import { fromForStream } from "../server/email/config";
import { listUnsubscribeHeaders } from "../server/email/headers";
import { suppressEmail } from "../server/email/suppression";
import { setEmailPreference } from "../server/email/preferences";
import { emailWebhookHandler } from "../server/api/emailWebhook";
import { renderCatalogEmail } from "../server/email/templates";
import { buildInviteEmailContent } from "../server/jobs/inviteEmailUtils";
import { buildVerificationEmailContent } from "../auth/email-and-pass/emails";

beforeEach(() => {
  resetEmailMemory();
  resetFakeEmailAdapter();
  process.env.EMAIL_PROVIDER = "fake";
  process.env.LIFECYCLE_EMAIL_SECRET = "test-secret-for-unsubscribe-tokens-32";
});

describe("email catalog", () => {
  it("keeps transactional, lifecycle and pastoral streams apart", () => {
    expect(streamForMessage(EMAIL_MESSAGE.AUTH_VERIFY)).toBe(
      EMAIL_STREAM.TRANSACTIONAL,
    );
    expect(streamForMessage(EMAIL_MESSAGE.LIFECYCLE_TRIAL_D1)).toBe(
      EMAIL_STREAM.LIFECYCLE,
    );
    expect(streamForMessage(EMAIL_MESSAGE.PASTORAL_ANNOUNCEMENT)).toBe(
      EMAIL_STREAM.PASTORAL,
    );
    expect(topicForMessage(EMAIL_MESSAGE.INVITE_STAFF)).toBeNull();
    expect(topicForMessage(EMAIL_MESSAGE.PRODUCT_BROADCAST)).toBe(
      EMAIL_TOPIC.PRODUCT_UPDATES,
    );
  });

  it("uses only catechis.app from addresses", () => {
    for (const stream of Object.values(EMAIL_STREAM)) {
      expect(fromForStream(stream).email).toMatch(/@catechis\.app$/);
      expect(fromForStream(stream).email).not.toContain("catequeseviva.com.br");
    }
  });
});

describe("outbox + fake provider", () => {
  it("persists then sends a catalog message", async () => {
    const result = await enqueueEmail({
      messageId: EMAIL_MESSAGE.SUPPORT_REPLY,
      to: "Ana@Parish.COM",
      payload: { name: "Ana", body: "Segue a resposta.", ctaUrl: "https://catechis.app/app/suporte" },
      idempotencyKey: "support.reply:msg-1",
    });
    expect(result.status).toBe("SENT");
    const sent = getFakeSentEmails();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ana@parish.com");
    expect(sent[0].from.email).toBe("noreply@catechis.app");
    expect(sent[0].html).toContain("Segue a resposta.");
    expect(sent[0].subject).toContain("suporte");
  });

  it("is idempotent on the same key", async () => {
    await enqueueEmail({
      messageId: EMAIL_MESSAGE.SUPPORT_REPLY,
      to: "a@b.com",
      payload: { name: "A", body: "x", ctaUrl: "/" },
      idempotencyKey: "support.reply:same",
    });
    const second = await enqueueEmail({
      messageId: EMAIL_MESSAGE.SUPPORT_REPLY,
      to: "a@b.com",
      payload: { name: "A", body: "x", ctaUrl: "/" },
      idempotencyKey: "support.reply:same",
    });
    expect(second.skipped).toBe("duplicate");
    expect(getFakeSentEmails()).toHaveLength(1);
  });

  it("does not send to a suppressed address", async () => {
    await suppressEmail({
      email: "bounce@x.com",
      reason: "HARD_BOUNCE",
      source: "test",
    });
    const result = await enqueueEmail({
      messageId: EMAIL_MESSAGE.PASTORAL_ANNOUNCEMENT,
      to: "bounce@x.com",
      payload: { subject: "Aviso", body: "Olá" },
      idempotencyKey: "pastoral:1",
    });
    expect(result.skipped).toBe("suppressed");
    expect(getFakeSentEmails()).toHaveLength(0);
  });

  it("honors lifecycle opt-out", async () => {
    await setEmailPreference({
      email: "opt@x.com",
      topic: EMAIL_TOPIC.LIFECYCLE,
      optedIn: false,
    });
    const result = await enqueueEmail({
      messageId: EMAIL_MESSAGE.LIFECYCLE_WELCOME,
      to: "opt@x.com",
      userId: "user-1",
      payload: { name: "Ada", ctaUrl: "https://catechis.app/app" },
      idempotencyKey: "welcome:user-1",
    });
    expect(result.skipped).toBe("opted_out");
    expect(getFakeSentEmails()).toHaveLength(0);
  });
});

describe("product events", () => {
  it("syncs the contact and sends welcome on signup", async () => {
    await emitProductEvent({
      name: PRODUCT_EVENT.USER_SIGNED_UP,
      email: "new@catechis.app",
      userId: "u-1",
      firstName: "João",
      isFamilyPortal: false,
    });
    expect(getFakeContacts()[0]?.email).toBe("new@catechis.app");
    expect(getFakeEvents().map((event) => event.name)).toContain(
      PRODUCT_EVENT.USER_SIGNED_UP,
    );
    expect(getFakeSentEmails().some((email) => email.subject.includes("Bem-vindo"))).toBe(
      true,
    );
  });
});

describe("broadcasts", () => {
  it("skips product news when the topic is opted out", async () => {
    await setEmailPreference({
      email: "news@x.com",
      topic: EMAIL_TOPIC.PRODUCT_UPDATES,
      optedIn: false,
    });
    const result = await enqueueProductBroadcast({
      to: "news@x.com",
      subject: "Novidade",
      body: "Changelog",
    });
    expect(result).toEqual({ skipped: "opted_out" });
    expect(getFakeBroadcasts()).toHaveLength(0);
  });
});

describe("list-unsubscribe headers", () => {
  it("returns only string values so Wasp tsc accepts Record<string, string>", () => {
    const transactional = listUnsubscribeHeaders(
      "tok",
      EMAIL_MESSAGE.AUTH_VERIFY,
    );
    expect(transactional).toEqual({});
    expect(
      Object.values(transactional).every((value) => typeof value === "string"),
    ).toBe(true);

    const pastoral = listUnsubscribeHeaders(
      "tok",
      EMAIL_MESSAGE.PASTORAL_ANNOUNCEMENT,
    );
    expect(pastoral["List-Unsubscribe"]).toContain(
      "/api/email/unsubscribe?token=tok",
    );
    expect(pastoral["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );

    expect(listUnsubscribeHeaders("", EMAIL_MESSAGE.PASTORAL_ANNOUNCEMENT)).toEqual(
      {},
    );
  });
});

describe("webhooks", () => {
  it("suppresses on bounce", async () => {
    const req = {
      body: {
        type: "email.bounced",
        data: { email_id: "re_1", to: ["bad@x.com"] },
      },
      headers: {},
      method: "POST",
    } as any;
    const res = {
      setHeader: () => undefined,
      status: () => res,
      json: () => res,
    } as any;
    await emailWebhookHandler(req, res, { entities: {} });
    const blocked = await enqueueEmail({
      messageId: EMAIL_MESSAGE.PASTORAL_MESSAGE,
      to: "bad@x.com",
      payload: { subject: "Oi", body: "Oi" },
      idempotencyKey: "after-bounce",
    });
    expect(blocked.skipped).toBe("suppressed");
  });
});

describe("templates", () => {
  it("renders invite and auth without mixing portals", () => {
    const family = buildInviteEmailContent({
      location: "Paróquia São José",
      role: "GUARDIAN",
      token: "abc",
    });
    expect(family.subject).toContain("Portal da Família");
    const rendered = renderCatalogEmail(EMAIL_MESSAGE.INVITE_FAMILY, "pt-BR", {
      location: "Paróquia São José",
      roleLabel: "Responsável familiar",
      link: family.link,
    });
    expect(rendered.html).toContain("Portal da Família");
    expect(rendered.html).toContain("Catequese Viva");

    const auth = buildVerificationEmailContent(
      "https://catechis.app/email-verification?token=abc",
    );
    expect(auth.html).toContain("painel pastoral");
    expect(auth.html).toContain("Catequese Viva");
  });
});

describe("outbox drain", () => {
  it("processes queued scheduled mail", async () => {
    await enqueueEmail({
      messageId: EMAIL_MESSAGE.BILLING_PAYMENT_FAILED,
      to: "pay@x.com",
      userId: "u-2",
      payload: { name: "Lia", ctaUrl: "https://catechis.app/app/billing" },
      idempotencyKey: "billing.fail:u-2",
      scheduledAt: new Date(Date.now() - 1000),
    });
    const drain = await processEmailOutbox(undefined, 10);
    expect(drain.processed + drain.sent).toBeGreaterThanOrEqual(0);
    expect(getFakeSentEmails().some((email) => email.to === "pay@x.com")).toBe(
      true,
    );
  });
});
