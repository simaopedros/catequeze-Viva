import { describe, expect, it } from "vitest";
import { isMobileOperationalRoute } from "../catequese/lib/shellChrome";

describe("shellChrome", () => {
  it("detects mobile operational attendance routes", () => {
    expect(
      isMobileOperationalRoute("/app/classes/abc-123/attendance"),
    ).toBe(true);
    expect(isMobileOperationalRoute("/app/classes/abc-123")).toBe(false);
  });

  it("detects mobile operational meeting routes", () => {
    expect(isMobileOperationalRoute("/app/meetings/meeting-1")).toBe(true);
    expect(isMobileOperationalRoute("/app/meetings")).toBe(false);
  });
});
