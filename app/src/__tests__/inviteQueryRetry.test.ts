import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { shouldRetryQueryFailure } from "../client/lib/queryRetry";

describe("invite / query retry policy", () => {
  const acceptPage = readFileSync(
    resolve(__dirname, "../catequese/pages/family/InviteAcceptPage.tsx"),
    "utf8",
  );
  const app = readFileSync(resolve(__dirname, "../client/App.tsx"), "utf8");

  it("does not retry 4xx (404, 410, 400, 429, 403)", () => {
    for (const status of [400, 403, 404, 410, 429]) {
      expect(
        shouldRetryQueryFailure(0, { statusCode: status }),
      ).toBe(false);
      expect(
        shouldRetryQueryFailure(0, new Error(`Request failed with status code ${status}`)),
      ).toBe(false);
    }
  });

  it("retries network / 5xx at most once", () => {
    expect(shouldRetryQueryFailure(0, { statusCode: 502 })).toBe(true);
    expect(shouldRetryQueryFailure(0, { statusCode: 503 })).toBe(true);
    expect(shouldRetryQueryFailure(0, new Error("Network Error"))).toBe(true);

    expect(shouldRetryQueryFailure(1, { statusCode: 502 })).toBe(false);
    expect(shouldRetryQueryFailure(1, new Error("Network Error"))).toBe(false);
    expect(shouldRetryQueryFailure(2, { statusCode: 500 })).toBe(false);
  });

  it("wires the policy on InviteAcceptPage and QueryClient defaults", () => {
    expect(acceptPage).toContain("shouldRetryQueryFailure");
    expect(acceptPage).toContain("retry: shouldRetryQueryFailure");
    expect(acceptPage).toContain("refetchOnWindowFocus: false");
    expect(app).toContain("shouldRetryQueryFailure");
    expect(app).toContain("retry: shouldRetryQueryFailure");
  });
});
