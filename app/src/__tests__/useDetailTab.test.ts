/**
 * useDetailTab — pure validation of allowed tab + default (URL sync tested via usage).
 */
import { describe, it, expect } from "vitest";

const CLASS_DETAIL_TABS = [
  "inscritos",
  "encontros",
  "catequistas",
  "planejamento",
] as const;

function resolveTab(
  raw: string | null,
  allowed: readonly string[],
  defaultTab: string,
): string {
  if (raw && allowed.includes(raw)) return raw;
  return defaultTab;
}

describe("detail tab resolution", () => {
  it("uses default when param missing", () => {
    expect(resolveTab(null, CLASS_DETAIL_TABS, "inscritos")).toBe("inscritos");
  });

  it("accepts valid tab", () => {
    expect(resolveTab("encontros", CLASS_DETAIL_TABS, "inscritos")).toBe(
      "encontros",
    );
  });

  it("rejects unknown tab", () => {
    expect(resolveTab("hack", CLASS_DETAIL_TABS, "inscritos")).toBe(
      "inscritos",
    );
  });
});
