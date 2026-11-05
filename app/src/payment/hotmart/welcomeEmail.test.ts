import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { EMAIL_MESSAGE } from "../../shared/emailCatalog";

const enqueueEmail = vi.fn();
const jwtState = vi.hoisted(() => ({
  createJWT: vi.fn(
    async (_payload: unknown, _options: unknown) => "jwt-test-token",
  ),
  spans: [] as Array<{ value: number; unit: string }>,
}));

vi.mock("../../server/email/service", () => ({
  enqueueEmail: (...args: unknown[]) => enqueueEmail(...args),
}));

vi.mock("wasp/auth/jwt", () => ({
  createJWT: (payload: unknown, options: unknown) =>
    jwtState.createJWT(payload, options),
  TimeSpan: class TimeSpan {
    constructor(value: number, unit: string) {
      jwtState.spans.push({ value, unit });
    }
  },
}));

vi.mock("wasp/server", () => ({
  config: { frontendUrl: "https://catechis.app" },
}));

import {
  buildHotmartAccessCopy,
  buildHotmartPlanActiveCopy,
  hotmartAccessIdempotencyKey,
  hotmartPlanActiveIdempotencyKey,
  HOTMART_HELP_EMAIL,
  HOTMART_LOGIN_URL,
  sendHotmartAccessEmailSafe,
  sendHotmartPlanActiveEmailSafe,
} from "./welcomeEmail";

const ACCESS_URL = "https://catechis.app/password-reset?token=jwt-test-token";

describe("hotmart purchase email", () => {
  beforeEach(() => {
    enqueueEmail.mockReset();
    enqueueEmail.mockResolvedValue({ id: "msg-1", status: "SENT" });
    jwtState.createJWT.mockClear();
    jwtState.spans.length = 0;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds the set-password email without prices, promises, or first person", () => {
    const copy = buildHotmartAccessCopy(ACCESS_URL, "single");
    expect(copy.subject).toBe("Seu acesso ao Catechis");
    expect(copy.ctaLabel).toBe("Definir senha e entrar");
    expect(copy.text).toContain("A compra do Plano Catequista foi confirmada");
    expect(copy.text).toContain(
      "O link expira em 7 dias e só pode ser usado uma vez.",
    );
    expect(copy.text).toContain(HOTMART_HELP_EMAIL);
    expect(copy.text).toContain(ACCESS_URL);
    expect(copy.text).not.toMatch(/\b(eu|meu|minha)\b/i);
    expect(copy.text).not.toMatch(
      /R\$|47|297|gratuito|trial|garantia|cadastr/i,
    );
  });

  it("builds the plan-active email with the login link", () => {
    const copy = buildHotmartPlanActiveCopy("single");
    expect(copy.subject).toBe("Seu plano no Catechis está ativo");
    expect(copy.heading).toBe("Seu plano está ativo");
    expect(copy.ctaLabel).toBe("Entrar");
    expect(copy.ctaUrl).toBe(HOTMART_LOGIN_URL);
    expect(copy.text).toContain(
      "O Plano Catequista está ativo para este e-mail.",
    );
    expect(copy.text).toContain(HOTMART_HELP_EMAIL);
    expect(copy.text).not.toMatch(/\b(eu|meu|minha)\b/i);
    expect(copy.text).not.toMatch(/R\$|47|297|gratuito|trial|garantia/i);
  });

  it("keys each email by transaction", () => {
    expect(hotmartAccessIdempotencyKey("HP123", "evt-1")).toBe(
      "hotmart.purchase_access:HP123",
    );
    expect(hotmartAccessIdempotencyKey(null, "evt-9")).toBe(
      "hotmart.purchase_access:evt-9",
    );
    expect(hotmartPlanActiveIdempotencyKey("HP123", "evt-1")).toBe(
      "hotmart.purchase_active:HP123",
    );
  });

  it("mints a 7 day reset token and enqueues the access email", async () => {
    const result = await sendHotmartAccessEmailSafe({
      email: " Comprador@Example.com ",
      transaction: "HP-ACCESS",
      eventId: "evt-access",
      planSlug: "single",
    });
    expect(result).toBe("sent");
    expect(jwtState.spans).toEqual([{ value: 7, unit: "d" }]);
    expect(jwtState.createJWT).toHaveBeenCalledWith(
      { email: "comprador@example.com" },
      { expiresIn: expect.any(Object) },
    );
    expect(enqueueEmail).toHaveBeenCalledTimes(1);
    expect(enqueueEmail.mock.calls[0][0]).toMatchObject({
      messageId: EMAIL_MESSAGE.BILLING_HOTMART_WELCOME,
      to: "comprador@example.com",
      locale: "pt-BR",
      idempotencyKey: "hotmart.purchase_access:HP-ACCESS",
      payload: {
        subject: "Seu acesso ao Catechis",
        ctaLabel: "Definir senha e entrar",
        ctaUrl: ACCESS_URL,
      },
    });
  });

  it("enqueues the plan-active email and survives a delivery failure", async () => {
    const result = await sendHotmartPlanActiveEmailSafe({
      email: "comprador@example.com",
      transaction: "HP-ACTIVE",
      eventId: "evt-active",
      planSlug: "single",
    });
    expect(result).toBe("sent");
    expect(enqueueEmail.mock.calls[0][0]).toMatchObject({
      idempotencyKey: "hotmart.purchase_active:HP-ACTIVE",
      payload: {
        subject: "Seu plano no Catechis está ativo",
        ctaUrl: HOTMART_LOGIN_URL,
      },
    });

    expect(
      await sendHotmartPlanActiveEmailSafe({
        email: null,
        transaction: "HP1",
        eventId: "e1",
      }),
    ).toBe("skipped");

    enqueueEmail.mockRejectedValueOnce(new Error("smtp down"));
    expect(
      await sendHotmartAccessEmailSafe({
        email: "a@b.com",
        transaction: "HP2",
        eventId: "e2",
      }),
    ).toBe("failed");
  });
});
