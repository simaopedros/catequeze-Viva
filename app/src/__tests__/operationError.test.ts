import { describe, expect, it, vi } from "vitest";
import {
  httpStatusFromError,
  isPlanLimitError,
  isTransientRequestError,
  withTransientRetry,
} from "../client/lib/operationError";

describe("httpStatusFromError", () => {
  it("reads Axios and Wasp status fields", () => {
    expect(httpStatusFromError({ statusCode: 403 })).toBe(403);
    expect(httpStatusFromError({ response: { status: 502 } })).toBe(502);
  });

  it("parses the Axios status-code message", () => {
    expect(
      httpStatusFromError(new Error("Request failed with status code 502")),
    ).toBe(502);
  });
});

describe("isTransientRequestError", () => {
  it("treats gateway failures as retryable", () => {
    expect(
      isTransientRequestError(new Error("Request failed with status code 502")),
    ).toBe(true);
    expect(isTransientRequestError({ statusCode: 503 })).toBe(true);
    expect(isTransientRequestError(new Error("Network Error"))).toBe(true);
  });

  it("does not retry plan limits or validation", () => {
    expect(isTransientRequestError({ statusCode: 403 })).toBe(false);
    expect(isTransientRequestError(new Error("LIMIT: turmas"))).toBe(false);
  });
});

describe("isPlanLimitError", () => {
  it("detects LIMIT payloads from billing enforcement", () => {
    expect(isPlanLimitError(new Error("LIMIT: Limite de turmas"))).toBe(true);
    expect(
      isPlanLimitError({ data: { message: "LIMIT: catequizandos" } }),
    ).toBe(true);
  });
});

describe("withTransientRetry", () => {
  it("retries a 502 and then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Request failed with status code 502"))
      .mockResolvedValueOnce("ok");

    await expect(withTransientRetry(fn, { delayMs: 1 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 403", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue({ statusCode: 403, message: "LIMIT: x" });
    await expect(withTransientRetry(fn, { delayMs: 1 })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
