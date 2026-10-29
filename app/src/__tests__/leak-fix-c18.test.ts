import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  jwt: vi.fn(),
  update: vi.fn(),
  sessions: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
  transaction: vi.fn(),
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
  prisma: {
    $transaction: mocks.transaction,
    session: { deleteMany: mocks.sessions },
  },
}));
vi.mock("wasp/auth/utils", () => ({
  createProviderId: (providerName: string, providerUserId: string) => ({
    providerName,
    providerUserId,
  }),
  findAuthIdentity: mocks.identity,
  getProviderDataWithPassword: JSON.parse,
  updateAuthIdentityProviderData: mocks.update,
}));
vi.mock("wasp/auth/jwt", () => ({ validateJWT: mocks.jwt }));
vi.mock("wasp/auth/password", () => ({
  hashPassword: mocks.hash,
  verifyPassword: vi.fn(),
}));
vi.mock("../server/auth/helpers", () => ({
  requireAuth: vi.fn(),
  writeAuditLog: vi.fn(),
  getDioceseParishIds: vi.fn(),
}));
vi.mock("../server/requestPortalContext", () => ({
  portalRequestContextMiddleware: (_req: any, _res: any, next: any) => next(),
}));
vi.mock("../server/middleware/rateLimiter", () => ({
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
}));
import { serverMiddlewareConfigFn } from "../server/globalMiddleware";
import { resetPasswordAndInvalidateSessions as reset } from "../server/operations/userOperations";
const args = { token: "synthetic-reset-link", password: "Synthetic123!" };
beforeEach(() => {
  vi.resetAllMocks();
  let consumed = new Set<string>();
  let queue = Promise.resolve();
  mocks.jwt.mockResolvedValue({
    email: "synthetic@example.test",
    exp: Math.floor(Date.now() / 1000) + 1800,
  });
  mocks.identity.mockResolvedValue({
    authId: "auth",
    providerData: JSON.stringify({
      hashedPassword: "old",
      isEmailVerified: false,
    }),
  });
  mocks.hash.mockResolvedValue("new-hash");
  mocks.create.mockImplementation(async ({ data }: any) => {
    if (consumed.has(data.key))
      throw Object.assign(new Error("duplicate"), { code: "P2002" });
    consumed.add(data.key);
  });
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation((fn: any) => {
    const result = queue.then(async () => {
      const previous = new Set(consumed);
      try {
        return await fn({
          rateLimitBucket: { create: mocks.create },
          authIdentity: { updateMany: mocks.update },
          session: { deleteMany: mocks.sessions },
        });
      } catch (error) {
        consumed = previous;
        throw error;
      }
    });
    queue = result.catch(() => {});
    return result;
  });
});
describe("C-18 consumo do link", () => {
  it("recusa reutilização e não troca a credencial novamente", async () => {
    await expect(reset(args, {})).resolves.toEqual({ success: true });
    await expect(reset(args, {})).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.sessions).toHaveBeenCalledTimes(1);
  });
  it("aceita só uma requisição concorrente", async () => {
    const results = await Promise.allSettled([
      reset(args, {}),
      reset(args, {}),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it.each(["PARISH_COORDINATOR", "LEAD_CATECHIST", "GUARDIAN", "ADMIN"])(
    "preserva reset do titular %s",
    async (role) => {
      await expect(reset(args, { user: { role } })).resolves.toEqual({
        success: true,
      });
      expect(mocks.sessions).toHaveBeenCalledWith({
        where: { userId: "auth" },
      });
    },
  );
  it("recusa JWT inválido antes de gravar", async () => {
    mocks.jwt.mockRejectedValue(new Error("invalid"));
    await expect(reset(args, {})).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("reverte consumo se a revogação falhar, permitindo nova tentativa", async () => {
    mocks.sessions.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(reset(args, {})).rejects.toThrow("database unavailable");
    await expect(reset(args, {})).resolves.toEqual({ success: true });
  });
  it("recusa alteração concorrente da identidade e não revoga sessões", async () => {
    mocks.update.mockResolvedValueOnce({ count: 0 });
    await expect(reset(args, {})).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.sessions).not.toHaveBeenCalled();
    await expect(reset(args, {})).resolves.toEqual({ success: true });
  });
  it("grava hash da credencial e conserva os demais metadados", async () => {
    await reset(args, {});
    const data = JSON.parse(mocks.update.mock.calls[0][0].data.providerData);
    expect(data).toEqual({ hashedPassword: "new-hash", isEmailVerified: true });
    expect(mocks.create.mock.calls[0][0].data.key).not.toContain(args.token);
  });
  it("falha fechada quando não consegue persistir o consumo", async () => {
    mocks.create.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(reset(args, {})).rejects.toThrow("database unavailable");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.sessions).not.toHaveBeenCalled();
  });
  it("recusa JWT expirado", async () => {
    mocks.jwt.mockResolvedValue({ email: "synthetic@example.test", exp: 1 });
    await expect(reset(args, {})).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("impede contornar o consumo pelo endpoint nativo do Wasp", async () => {
    const config = serverMiddlewareConfigFn(new Map() as any);
    const fallback = vi.fn((_req: any, res: any) =>
      res.json({ success: true }),
    );
    const dispatch = () =>
      new Promise((resolve, reject) => {
        const handlers = [...config.values(), fallback] as any[];
        let index = 0;
        const req = {
          method: "POST",
          originalUrl: "/auth/email/reset-password",
          path: "/email/reset-password",
          body: args,
        };
        const res = { json: resolve };
        const next = (error?: any) => {
          if (error) return reject(error);
          try {
            handlers[index++](req, res, next);
          } catch (err) {
            reject(err);
          }
        };
        next();
      });
    await expect(dispatch()).resolves.toEqual({ success: true });
    await expect(dispatch()).rejects.toMatchObject({ statusCode: 400 });
    expect(fallback).not.toHaveBeenCalled();
  });
  it("não permite reuso com outra codificação da assinatura do mesmo JWT", async () => {
    const token =
      "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS50ZXN0In0.c3ludGhldGlj";
    await reset({ ...args, token }, {});
    await expect(
      reset({ ...args, token: `${token}=` }, {}),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
