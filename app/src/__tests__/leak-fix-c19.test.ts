import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  sdk: {} as any,
  mark: vi.fn(),
  suppress: vi.fn(),
  preference: vi.fn(),
}));
vi.mock("resend", () => ({
  Resend: class {
    constructor() {
      return m.sdk;
    }
  },
}));
vi.mock("express", () => ({ default: { raw: () => () => undefined } }));
vi.mock("../server/logger", () => ({ logger: { warn: vi.fn() } }));
vi.mock("../server/email/service", () => ({ markOutboxByProviderId: m.mark }));
vi.mock("../server/email/suppression", () => ({ suppressEmail: m.suppress }));
vi.mock("../server/email/preferences", () => ({
  setEmailPreference: m.preference,
}));
import { resendEmailAdapter } from "../server/email/adapters/resend";
import {
  emailWebhookMiddlewareConfigFn,
  emailWebhookHandler,
} from "../server/api/emailWebhook";
const context = { entities: {} };
const payload =
  ' { "type": "email.bounced", "data": { "email_id": "synthetic-id", "to": ["synthetic@example.invalid"] } }\n';
async function request(raw = payload) {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  await emailWebhookHandler(
    {
      body: Buffer.from(raw),
      headers: { "svix-id": ["synthetic-event"] },
    } as any,
    res as any,
    context,
  );
  return res;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EMAIL_PROVIDER", "resend");
  vi.stubEnv("RESEND_API_KEY", "synthetic-api-key");
  vi.stubEnv("RESEND_WEBHOOK_SECRET", "synthetic-secret");
  m.sdk = { webhooks: { verify: vi.fn() } };
});
afterEach(() => vi.unstubAllEnvs());
function noWrites() {
  for (const fn of [m.mark, m.suppress, m.preference])
    expect(fn).not.toHaveBeenCalled();
}
describe("C-19: webhook exige provedor e assinatura verificável", () => {
  it("configura parser bruto somente para esta rota", () => {
    const jsonParser = vi.fn();
    const config = new Map([
      ["express.json", jsonParser],
      ["other", jsonParser],
    ]);
    expect(emailWebhookMiddlewareConfigFn(config as any)).toBe(config);
    expect(config.has("express.json")).toBe(false);
    expect(config.get("express.raw")).toBeTypeOf("function");
    expect(config.get("other")).toBe(jsonParser);
  });
  it.each(["secret", "client", "verifier", "fake"])(
    "recusa ausência de %s com 503",
    async (missing) => {
      if (missing === "secret") vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
      if (missing === "client") vi.stubEnv("RESEND_API_KEY", "");
      if (missing === "verifier") m.sdk = { webhooks: {} };
      if (missing === "fake") vi.stubEnv("EMAIL_PROVIDER", "fake");
      expect((await request()).status).toHaveBeenCalledWith(503);
      noWrites();
    },
  );
  it("nega reprodução no adaptador sem verificador", async () => {
    m.sdk = { webhooks: {} };
    await expect(
      resendEmailAdapter.verifyWebhook(payload, {}),
    ).rejects.toThrow();
  });
  it("recusa assinatura inválida antes de escrever", async () => {
    m.sdk.webhooks.verify.mockRejectedValue(new Error("invalid signature"));
    expect((await request()).status).toHaveBeenCalledWith(400);
    noWrites();
  });
  it.each(["email.delivered", "email.bounced", "email.complained"])(
    "preserva evento legítimo %s e corpo original",
    async (type) => {
      const raw = payload.replace("email.bounced", type);
      expect((await request(raw)).status).toHaveBeenCalledWith(200);
      expect(m.sdk.webhooks.verify).toHaveBeenCalledWith({
        payload: raw,
        headers: { id: "synthetic-event", timestamp: undefined, signature: undefined },
        webhookSecret: "synthetic-secret",
      });
      if (type === "email.delivered")
        expect(m.mark).toHaveBeenCalledWith(
          "synthetic-id",
          "DELIVERED",
          context,
        );
      else
        expect(m.suppress).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "synthetic@example.invalid",
            reason: type === "email.bounced" ? "HARD_BOUNCE" : "COMPLAINT",
            context,
          }),
        );
      if (type === "email.complained")
        expect(m.preference).toHaveBeenCalledWith(
          expect.objectContaining({ optedIn: false, context }),
        );
    },
  );
});
