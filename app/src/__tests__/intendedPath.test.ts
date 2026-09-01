import { describe, expect, it } from "vitest";
import { isSafeInternalPath } from "../auth/intendedPath";

describe("post-login deep link safety", () => {
  it("accepts in-app paths only", () => {
    expect(isSafeInternalPath("/app")).toBe(true);
    expect(isSafeInternalPath("/app/classes/123?tab=meetings")).toBe(true);
    expect(isSafeInternalPath("/admin/parishes")).toBe(true);
    expect(isSafeInternalPath("/account")).toBe(true);
  });

  it("rejects open redirects, auth pages and public routes", () => {
    expect(isSafeInternalPath("https://evil.example/app")).toBe(false);
    expect(isSafeInternalPath("//evil.example/app")).toBe(false);
    expect(isSafeInternalPath("/login")).toBe(false);
    expect(isSafeInternalPath("/signup?next=/app")).toBe(false);
    expect(isSafeInternalPath("/pricing")).toBe(false);
    expect(isSafeInternalPath("/application")).toBe(false);
    expect(isSafeInternalPath("")).toBe(false);
    expect(isSafeInternalPath(null)).toBe(false);
  });
});
