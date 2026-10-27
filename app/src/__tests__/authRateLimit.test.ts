/**
 * Auth failure rate limit — peek before next, consume only on 4xx (≠429).
 */
import { createHash } from "crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  getExpressRequestPath,
  isAuthCredentialPostPath,
  isAuthLoginPostPath,
} from "../server/security/authRateLimitPaths";

const consumeMock = vi.fn();
const peekMock = vi.fn();
const loggerWarnMock = vi.fn();
const queryRawMock = vi.fn();

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}));

vi.mock("../server/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    error: vi.fn(),
  },
}));

vi.mock("../server/security/persistentRateLimit", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../server/security/persistentRateLimit")>();
  return {
    ...actual,
    consumePersistentRateLimit: (...args: unknown[]) => consumeMock(...args),
    peekPersistentRateLimit: (...args: unknown[]) => peekMock(...args),
  };
});

function expectedEmailHash(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

describe("auth rate limit paths", () => {
  it("reconstructs /auth/... when Express strips mount (req.path = /email/login)", () => {
    expect(
      getExpressRequestPath({
        path: "/email/login",
        baseUrl: "/auth",
        url: "/email/login",
        originalUrl: "/auth/email/login",
      }),
    ).toBe("/auth/email/login");
  });

  it("prefers originalUrl over stripped path", () => {
    expect(
      getExpressRequestPath({
        path: "/email/login",
        originalUrl: "/auth/email/login?x=1",
      }),
    ).toBe("/auth/email/login");
  });

  it("falls back to baseUrl + path when originalUrl is missing", () => {
    expect(
      getExpressRequestPath({
        path: "/email/signup",
        baseUrl: "/auth",
      }),
    ).toBe("/auth/email/signup");
  });

  it("matches credential POSTs and distinguishes login", () => {
    expect(isAuthCredentialPostPath("/auth/email/login")).toBe(true);
    expect(isAuthLoginPostPath("/auth/email/login")).toBe(true);
    expect(isAuthLoginPostPath("/auth/username/login")).toBe(true);

    expect(isAuthCredentialPostPath("/auth/email/signup")).toBe(true);
    expect(isAuthLoginPostPath("/auth/email/signup")).toBe(false);
    expect(
      isAuthCredentialPostPath("/auth/email/request-password-reset"),
    ).toBe(true);
    expect(isAuthLoginPostPath("/auth/email/request-password-reset")).toBe(
      false,
    );
    expect(isAuthCredentialPostPath("/auth/email/reset-password")).toBe(true);
    expect(isAuthLoginPostPath("/auth/email/reset-password")).toBe(false);

    // Mount-stripped path alone must NOT match
    expect(isAuthCredentialPostPath("/email/login")).toBe(false);
    expect(isAuthLoginPostPath("/email/login")).toBe(false);
    expect(isAuthCredentialPostPath("/auth/email/verify-email")).toBe(false);
    expect(isAuthCredentialPostPath("/auth/logout")).toBe(false);
    expect(isAuthCredentialPostPath("/auth/me")).toBe(false);
  });
});

describe("authRateLimiter middleware", () => {
  beforeEach(() => {
    consumeMock.mockReset();
    peekMock.mockReset();
    loggerWarnMock.mockReset();
    peekMock.mockResolvedValue({ allowed: true });
    consumeMock.mockResolvedValue({ allowed: true });
  });

  function mockRes(initialStatus = 200) {
    const finishHandlers: Array<() => void> = [];
    const res = {
      statusCode: initialStatus,
      headers: {} as Record<string, string>,
      body: undefined as unknown,
      setHeader(name: string, value: string) {
        this.headers[name] = value;
        return this;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
      on(event: string, handler: () => void) {
        if (event === "finish") finishHandlers.push(handler);
        return this;
      },
      emitFinish() {
        for (const h of finishHandlers) h();
      },
    };
    return res as unknown as Response & {
      statusCode: number;
      headers: Record<string, string>;
      body: unknown;
      emitFinish: () => void;
    };
  }

  function loginReq(overrides: Record<string, unknown> = {}) {
    return {
      method: "POST",
      path: "/email/login",
      baseUrl: "/auth",
      originalUrl: "/auth/email/login",
      headers: { "cf-connecting-ip": "203.0.113.10" },
      body: { email: "User@Example.com", password: "x" },
      ...overrides,
    } as unknown as Request;
  }

  async function runMiddleware(req: Request, res: ReturnType<typeof mockRes>) {
    const { authRateLimiter } = await import(
      "../server/middleware/rateLimiter"
    );
    const next = vi.fn() as unknown as NextFunction;
    authRateLimiter(req, res, next);
    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledOnce();
    });
    return next;
  }

  it("GET is not rate-limited", async () => {
    const { authRateLimiter } = await import(
      "../server/middleware/rateLimiter"
    );
    const req = loginReq({ method: "GET" });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    authRateLimiter(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(peekMock).not.toHaveBeenCalled();
    expect(consumeMock).not.toHaveBeenCalled();
  });

  it("successful login (2xx) does not increment buckets", async () => {
    const res = mockRes(200);
    await runMiddleware(loginReq(), res);
    res.emitFinish();
    await Promise.resolve();

    expect(peekMock).toHaveBeenCalled();
    expect(consumeMock).not.toHaveBeenCalled();
  });

  it("failed login (401) increments email + IP buckets with hashed email key", async () => {
    const res = mockRes(401);
    await runMiddleware(loginReq(), res);
    res.emitFinish();
    await vi.waitFor(() => {
      expect(consumeMock).toHaveBeenCalled();
    });

    const hash = expectedEmailHash("User@Example.com");
    expect(hash).toHaveLength(32);
    expect(consumeMock).toHaveBeenCalledWith(
      `203.0.113.10:${hash}`,
      expect.objectContaining({ scope: "auth-fail-email", max: 10 }),
    );
    expect(consumeMock).toHaveBeenCalledWith(
      "203.0.113.10",
      expect.objectContaining({ scope: "auth-fail-ip", max: 100 }),
    );

    // No plaintext email in consume keys
    for (const call of consumeMock.mock.calls) {
      const key = String(call[0]);
      expect(key.toLowerCase()).not.toContain("user@example.com");
      expect(key).not.toContain("@");
    }
  });

  it("blocks 11th attempt for same IP+email with 429 + Retry-After after 10 failures", async () => {
    const { authRateLimiter } = await import(
      "../server/middleware/rateLimiter"
    );
    const buckets = new Map<string, { count: number; resetAt: number }>();
    const windowMs = 15 * 60 * 1000;

    peekMock.mockImplementation(
      async (id: string, config: { scope: string; max: number }) => {
        const key = `${config.scope}:${id}`;
        const entry = buckets.get(key);
        const now = Date.now();
        if (!entry || entry.resetAt <= now) return { allowed: true };
        if (entry.count >= config.max) {
          return {
            allowed: false,
            retryAfterSec: Math.max(
              1,
              Math.ceil((entry.resetAt - now) / 1000),
            ),
          };
        }
        return { allowed: true };
      },
    );
    consumeMock.mockImplementation(
      async (id: string, config: { scope: string; windowMs: number }) => {
        const key = `${config.scope}:${id}`;
        const now = Date.now();
        const entry = buckets.get(key);
        if (!entry || entry.resetAt <= now) {
          buckets.set(key, { count: 1, resetAt: now + (config.windowMs || windowMs) });
        } else {
          entry.count += 1;
        }
        return { allowed: true };
      },
    );

    // 10 failed logins
    for (let i = 0; i < 10; i++) {
      const res = mockRes(401);
      const next = vi.fn() as unknown as NextFunction;
      authRateLimiter(loginReq(), res, next);
      await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
      res.emitFinish();
      await vi.waitFor(() => {
        expect(consumeMock.mock.calls.length).toBeGreaterThanOrEqual((i + 1) * 2);
      });
    }

    // 11th attempt blocked before handler
    const blocked = mockRes();
    const next11 = vi.fn() as unknown as NextFunction;
    authRateLimiter(loginReq(), blocked, next11);
    await vi.waitFor(() => {
      expect(blocked.statusCode).toBe(429);
    });

    expect(next11).not.toHaveBeenCalled();
    expect(blocked.headers["Retry-After"]).toBeTruthy();
    expect(Number(blocked.headers["Retry-After"])).toBeGreaterThan(0);
    expect(blocked.body).toMatchObject({
      error: "Muitas tentativas. Aguarde 15 minutos.",
    });
  });

  it("does not block a different email on the same IP when only email bucket is full", async () => {
    const fullHash = expectedEmailHash("blocked@example.com");
    peekMock.mockImplementation(async (id: string, config: { scope: string }) => {
      if (
        config.scope === "auth-fail-email" &&
        id === `203.0.113.10:${fullHash}`
      ) {
        return { allowed: false, retryAfterSec: 900 };
      }
      return { allowed: true };
    });

    const res = mockRes(401);
    await runMiddleware(
      loginReq({ body: { email: "other@example.com", password: "x" } }),
      res,
    );
    expect(res.statusCode).toBe(401);
    res.emitFinish();
    await vi.waitFor(() => {
      expect(consumeMock).toHaveBeenCalled();
    });

    const otherHash = expectedEmailHash("other@example.com");
    expect(consumeMock).toHaveBeenCalledWith(
      `203.0.113.10:${otherHash}`,
      expect.objectContaining({ scope: "auth-fail-email" }),
    );
  });

  it("enforces IP ceiling for all credential routes (signup without email key)", async () => {
    const { authRateLimiter } = await import(
      "../server/middleware/rateLimiter"
    );
    peekMock.mockImplementation(async (_id: string, config: { scope: string }) => {
      if (config.scope === "auth-fail-ip") {
        return { allowed: false, retryAfterSec: 600 };
      }
      return { allowed: true };
    });

    const req = {
      method: "POST",
      path: "/email/signup",
      baseUrl: "/auth",
      originalUrl: "/auth/email/signup",
      headers: { "cf-connecting-ip": "203.0.113.10" },
      body: { email: "new@example.com", password: "x" },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    authRateLimiter(req, res, next);
    await vi.waitFor(() => {
      expect(res.statusCode).toBe(429);
    });

    expect(next).not.toHaveBeenCalled();
    // Signup must not peek the email bucket
    expect(peekMock).toHaveBeenCalledWith(
      "203.0.113.10",
      expect.objectContaining({ scope: "auth-fail-ip" }),
    );
    expect(
      peekMock.mock.calls.some(
        (c) => (c[1] as { scope: string }).scope === "auth-fail-email",
      ),
    ).toBe(false);
  });

  it("hashAuthIdentifier never embeds plaintext email", async () => {
    const { hashAuthIdentifier, buildAuthFailEmailKey } = await import(
      "../server/middleware/rateLimiter"
    );
    const email = "catequista@paroquia.org";
    const hash = hashAuthIdentifier(email);
    expect(hash).toHaveLength(32);
    expect(hash).not.toContain("@");
    expect(hash.toLowerCase()).not.toContain("catequista");

    const key = buildAuthFailEmailKey("198.51.100.1", { email });
    expect(key).toBe(`198.51.100.1:${hash}`);
    expect(key).not.toContain(email);
    expect(key).not.toContain("@");
  });

  it("skips non-credential /auth paths", async () => {
    const { authRateLimiter } = await import(
      "../server/middleware/rateLimiter"
    );
    const req = {
      method: "POST",
      path: "/email/verify-email",
      baseUrl: "/auth",
      originalUrl: "/auth/email/verify-email",
      headers: {},
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    authRateLimiter(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(peekMock).not.toHaveBeenCalled();
    expect(consumeMock).not.toHaveBeenCalled();
  });

  it("logs and fail-opens when peek throws (DB unavailable)", async () => {
    const { authRateLimiter } = await import(
      "../server/middleware/rateLimiter"
    );
    peekMock.mockRejectedValue(new Error("db connection refused"));

    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    authRateLimiter(loginReq(), res, next);

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledOnce();
    });

    expect(res.statusCode).toBe(200);
    expect(loggerWarnMock).toHaveBeenCalledWith(
      "[rateLimit] auth middleware fail-open",
      expect.objectContaining({
        scope: "auth-fail-ip",
        error: expect.stringContaining("db connection refused"),
      }),
    );
  });

  it("does not increment on 429 responses", async () => {
    const res = mockRes(429);
    await runMiddleware(loginReq(), res);
    res.emitFinish();
    await Promise.resolve();
    expect(consumeMock).not.toHaveBeenCalled();
  });
});

describe("peekPersistentRateLimit", () => {
  it("allows when bucket missing or window expired", async () => {
    queryRawMock.mockReset();
    queryRawMock.mockResolvedValueOnce([]);

    const actual = await vi.importActual<
      typeof import("../server/security/persistentRateLimit")
    >("../server/security/persistentRateLimit");

    const missing = await actual.peekPersistentRateLimit(
      "203.0.113.1",
      actual.AUTH_FAIL_IP_RATE_LIMIT,
    );
    expect(missing).toEqual({ allowed: true });

    queryRawMock.mockResolvedValueOnce([
      { count: 99, resetAt: new Date(Date.now() - 1000) },
    ]);
    const expired = await actual.peekPersistentRateLimit(
      "203.0.113.1",
      actual.AUTH_FAIL_IP_RATE_LIMIT,
    );
    expect(expired).toEqual({ allowed: true });
  });

  it("denies when count >= max without incrementing", async () => {
    queryRawMock.mockReset();
    const resetAt = new Date(Date.now() + 60_000);
    queryRawMock.mockResolvedValueOnce([{ count: 10, resetAt }]);

    const actual = await vi.importActual<
      typeof import("../server/security/persistentRateLimit")
    >("../server/security/persistentRateLimit");

    const result = await actual.peekPersistentRateLimit(
      "203.0.113.2:abcd",
      actual.AUTH_FAIL_EMAIL_RATE_LIMIT,
    );
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBeGreaterThan(0);
    // SELECT only — no INSERT in the SQL template args path; just ensure one call
    expect(queryRawMock).toHaveBeenCalledOnce();
  });
});

describe("consumePersistentRateLimit DB error logging", () => {
  it("logs warn and returns failedOpen when $queryRaw throws", async () => {
    loggerWarnMock.mockReset();
    queryRawMock.mockReset();
    queryRawMock.mockRejectedValue(
      new Error('relation "RateLimitBucket" does not exist'),
    );

    const actual = await vi.importActual<
      typeof import("../server/security/persistentRateLimit")
    >("../server/security/persistentRateLimit");

    const result = await actual.consumePersistentRateLimit(
      "203.0.113.77",
      actual.AUTH_FAIL_IP_RATE_LIMIT,
    );

    expect(result).toEqual({ allowed: true, failedOpen: true });
    expect(loggerWarnMock).toHaveBeenCalledWith(
      "[rateLimit] fail-open on DB error",
      expect.objectContaining({
        scope: "auth-fail-ip",
        error: expect.stringContaining("RateLimitBucket"),
      }),
    );
  });
});
