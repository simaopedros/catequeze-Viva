/**
 * Auth login rate limit — path resolution under Wasp mount + 429 / fail-open.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  getExpressRequestPath,
  isAuthCredentialPostPath,
} from "../server/security/authRateLimitPaths";

const consumeMock = vi.fn();
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
  };
});

describe("auth rate limit paths", () => {
  it("reconstructs /auth/... when Express strips mount (req.path = /email/login)", () => {
    // Wasp: router.use('/auth', middleware, auth) → path is mount-relative
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

  it("matches only login/signup/reset credential POSTs under /auth", () => {
    expect(isAuthCredentialPostPath("/auth/email/login")).toBe(true);
    expect(isAuthCredentialPostPath("/auth/email/signup")).toBe(true);
    expect(isAuthCredentialPostPath("/auth/email/request-password-reset")).toBe(
      true,
    );
    expect(isAuthCredentialPostPath("/auth/email/reset-password")).toBe(true);
    // Mount-stripped path alone must NOT match (old bug used req.path)
    expect(isAuthCredentialPostPath("/email/login")).toBe(false);
    expect(isAuthCredentialPostPath("/auth/email/verify-email")).toBe(false);
    expect(isAuthCredentialPostPath("/auth/logout")).toBe(false);
    expect(isAuthCredentialPostPath("/auth/me")).toBe(false);
    expect(isAuthCredentialPostPath("/operations/get-user")).toBe(false);
  });
});

describe("authRateLimiter middleware", () => {
  beforeEach(() => {
    consumeMock.mockReset();
    loggerWarnMock.mockReset();
  });

  function mockRes() {
    const res = {
      statusCode: 200,
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
    };
    return res as unknown as Response & {
      statusCode: number;
      headers: Record<string, string>;
      body: unknown;
    };
  }

  it("returns 429 with Retry-After after the configured limit", async () => {
    const { authRateLimiter } = await import(
      "../server/middleware/rateLimiter"
    );
    consumeMock.mockResolvedValue({
      allowed: false,
      retryAfterSec: 900,
    });

    const req = {
      method: "POST",
      path: "/email/login",
      baseUrl: "/auth",
      originalUrl: "/auth/email/login",
      headers: { "cf-connecting-ip": "203.0.113.10" },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    authRateLimiter(req, res, next);
    await vi.waitFor(() => {
      expect(res.statusCode).toBe(429);
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.headers["Retry-After"]).toBe("900");
    expect(res.body).toMatchObject({
      retryAfter: 900,
    });
    expect(consumeMock).toHaveBeenCalledWith(
      "203.0.113.10",
      expect.objectContaining({ scope: "auth-login" }),
    );
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
    expect(consumeMock).not.toHaveBeenCalled();
  });

  it("logs and fail-opens when consume throws (DB unavailable)", async () => {
    const { authRateLimiter } = await import(
      "../server/middleware/rateLimiter"
    );
    consumeMock.mockRejectedValue(new Error("db connection refused"));

    const req = {
      method: "POST",
      path: "/email/login",
      baseUrl: "/auth",
      originalUrl: "/auth/email/login",
      headers: { "x-forwarded-for": "198.51.100.9" },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    authRateLimiter(req, res, next);
    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledOnce();
    });

    expect(res.statusCode).toBe(200);
    expect(loggerWarnMock).toHaveBeenCalledWith(
      "[rateLimit] auth middleware fail-open",
      expect.objectContaining({
        scope: "auth-login",
        error: expect.stringContaining("db connection refused"),
      }),
    );
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
      actual.AUTH_LOGIN_RATE_LIMIT,
    );

    expect(result).toEqual({ allowed: true, failedOpen: true });
    expect(loggerWarnMock).toHaveBeenCalledWith(
      "[rateLimit] fail-open on DB error",
      expect.objectContaining({
        scope: "auth-login",
        error: expect.stringContaining("RateLimitBucket"),
      }),
    );
  });
});
