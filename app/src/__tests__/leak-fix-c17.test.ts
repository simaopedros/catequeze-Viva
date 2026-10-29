import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  identity: vi.fn(),
  resend: vi.fn(),
  send: vi.fn(),
  consume: vi.fn(),
  fake: vi.fn(),
}));
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message: string,
    ) {
      super(message);
    }
  },
  prisma: {},
}));
vi.mock("wasp/auth/utils", () => ({
  createProviderId: (_: string, email: string) => email,
  findAuthIdentity: m.identity,
  getProviderDataWithPassword: JSON.parse,
  doFakeWork: m.fake,
}));
vi.mock("wasp/auth/validation", () => ({ ensureValidEmail: vi.fn() }));
vi.mock("wasp/server/auth/email/utils", () => ({
  createPasswordResetLink: vi.fn().mockResolvedValue("synthetic-link"),
  isEmailResendAllowed: m.resend,
  sendPasswordResetEmail: m.send,
}));
vi.mock("../auth/email-and-pass/emails", () => ({
  getPasswordResetEmailContent: () => ({ subject: "Redefinir senha" }),
}));
vi.mock("../server/security/persistentRateLimit", () => ({
  consumePersistentRateLimit: m.consume,
}));
vi.mock("../server/operations/documentStageOperations", () => ({}));
vi.mock("wasp/auth/password", () => ({}));
vi.mock("wasp/auth/session", () => ({}));
vi.mock("../server/operations/userContext", () => ({}));
vi.mock("../server/auth/sessionIdentity", () => ({}));
vi.mock("../server/operations/workspaceOperations", () => ({}));
vi.mock("../server/operations/notificationOperations", () => ({}));
vi.mock("../server/operations/dashboardOperations", () => ({}));
vi.mock("../server/operations/classOperations", () => ({}));
vi.mock("../server/operations/catechumenOperations", () => ({}));
vi.mock("../server/operations/familyOperations", () => ({}));
vi.mock("../server/operations/meetingOperations", () => ({}));
vi.mock("../server/operations/documentOperations", () => ({}));
vi.mock("../server/operations/conversationOperations", () => ({}));
vi.mock("../server/operations/twoFactorOperations", () => ({}));
vi.mock("../server/security/authAttemptGuard", () => ({}));
vi.mock("../server/api/authenticatedDocumentUpload", () => ({}));
vi.mock("../server/api/documents", () => ({}));
import { mobileAuthPasswordResetRequest as request } from "../server/api/mobile";
const req = {
  body: { email: "synthetic@example.test" },
  ip: "127.0.0.1",
  headers: {},
} as any;
const res = () => ({ json: vi.fn((value: any) => value) }) as any;
beforeEach(() => {
  vi.clearAllMocks();
  m.consume.mockResolvedValue({ allowed: true });
  m.identity.mockResolvedValue({ providerData: "{}" });
  m.resend.mockReturnValue({ isResendAllowed: true, timeLeft: 0 });
});
describe("C-17 resposta genérica e limite persistente", () => {
  it("não revela conta em cooldown", async () => {
    m.resend.mockReturnValue({ isResendAllowed: false, timeLeft: 50 });
    const existing = await request(req, res(), {});
    m.identity.mockResolvedValue(null);
    expect(await request(req, res(), {})).toEqual(existing);
    expect(existing).toEqual({ success: true });
    expect(m.send).not.toHaveBeenCalled();
  });
  it("limita inclusive conta inexistente antes da consulta", async () => {
    m.consume.mockResolvedValue({ allowed: false });
    expect(await request(req, res(), {})).toEqual({ success: true });
    expect(m.identity).not.toHaveBeenCalled();
    expect(m.send).not.toHaveBeenCalled();
  });
  it("envia recuperação legítima com resposta mínima", async () => {
    expect(await request(req, res(), {})).toEqual({ success: true });
    expect(m.send).toHaveBeenCalledTimes(1);
    expect(m.consume).toHaveBeenCalledTimes(2);
  });
  it("mantém resposta genérica se o provedor falhar", async () => {
    m.send.mockRejectedValueOnce(new Error("transport unavailable"));
    expect(await request(req, res(), {})).toEqual({ success: true });
  });
  it("não envia se o limitador não persistir a tentativa", async () => {
    m.consume.mockResolvedValue({ allowed: true, failedOpen: true });
    expect(await request(req, res(), {})).toEqual({ success: true });
    expect(m.send).not.toHaveBeenCalled();
  });
  it("normaliza identificador e ignora headers de IP fornecidos pelo cliente", async () => {
    await request(
      {
        ...req,
        body: { email: " SYNTHETIC@example.test " },
        headers: { "x-forwarded-for": "fake", "cf-connecting-ip": "fake" },
      },
      res(),
      {},
    );
    expect(m.consume.mock.calls[0][0]).toBe("127.0.0.1");
    const identifier = m.consume.mock.calls[1][0];
    expect(identifier).toMatch(/^[a-f0-9]{64}$/);
    m.consume.mockClear();
    await request(req, res(), {});
    expect(m.consume.mock.calls[1][0]).toBe(identifier);
  });
});
