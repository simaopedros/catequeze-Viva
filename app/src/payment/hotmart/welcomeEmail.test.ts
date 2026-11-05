import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildHotmartWelcomeCopy,
  hotmartWelcomeIdempotencyKey,
  HOTMART_HELP_EMAIL,
  HOTMART_SIGNUP_URL,
  sendHotmartWelcomeEmailSafe,
} from "./welcomeEmail";
import { EMAIL_MESSAGE } from "../../shared/emailCatalog";

const enqueueEmail = vi.fn();

vi.mock("../../server/email/service", () => ({
  enqueueEmail: (...args: unknown[]) => enqueueEmail(...args),
}));

describe("hotmart welcome email", () => {
  beforeEach(() => {
    enqueueEmail.mockReset();
    enqueueEmail.mockResolvedValue({ id: "msg-1", status: "SENT" });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds impersonal pt-BR copy without prices or promises", () => {
    const copy = buildHotmartWelcomeCopy();
    expect(copy.subject).toBe("Sua compra do Plano Catequista no Catechis");
    expect(copy.text).toContain("Obrigado pela compra do Plano Catequista");
    expect(copy.text).toContain(HOTMART_SIGNUP_URL);
    expect(copy.text).toContain("mesmo e-mail da compra");
    expect(copy.text).toContain("confirme esse e-mail");
    expect(copy.text).toContain("liberado automaticamente");
    expect(copy.text).toContain(HOTMART_HELP_EMAIL);
    expect(copy.text).not.toMatch(/R\$|47|297|gratuito|trial|garantia/i);
    expect(copy.text).not.toMatch(/\bvocê pode\b|\bprometo\b|\bgaranto\b/i);
  });

  it("keys idempotency by transaction when present", () => {
    expect(hotmartWelcomeIdempotencyKey("HP123", "evt-1")).toBe(
      "hotmart.purchase_welcome:HP123",
    );
    expect(hotmartWelcomeIdempotencyKey(null, "evt-9")).toBe(
      "hotmart.purchase_welcome:evt-9",
    );
  });

  it("enqueues once with transactional catalog id", async () => {
    const result = await sendHotmartWelcomeEmailSafe({
      email: " Comprador@Example.com ",
      transaction: "HP-WELCOME",
      eventId: "evt-welcome",
    });
    expect(result).toBe("sent");
    expect(enqueueEmail).toHaveBeenCalledTimes(1);
    expect(enqueueEmail.mock.calls[0][0]).toMatchObject({
      messageId: EMAIL_MESSAGE.BILLING_HOTMART_WELCOME,
      to: "comprador@example.com",
      locale: "pt-BR",
      idempotencyKey: "hotmart.purchase_welcome:HP-WELCOME",
      payload: {
        ctaUrl: HOTMART_SIGNUP_URL,
      },
    });
  });

  it("skips without email and does not throw when enqueue fails", async () => {
    expect(
      await sendHotmartWelcomeEmailSafe({
        email: null,
        transaction: "HP1",
        eventId: "e1",
      }),
    ).toBe("skipped");
    expect(enqueueEmail).not.toHaveBeenCalled();

    enqueueEmail.mockRejectedValueOnce(new Error("smtp down"));
    expect(
      await sendHotmartWelcomeEmailSafe({
        email: "a@b.com",
        transaction: "HP2",
        eventId: "e2",
      }),
    ).toBe("failed");
  });
});
