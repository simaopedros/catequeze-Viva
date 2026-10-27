import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("a11y icon buttons", () => {
  it('DocumentsPage: every size="icon" Button has aria-label on the same tag', () => {
    const src = readFileSync(
      resolve(__dirname, "../catequese/pages/DocumentsPage.tsx"),
      "utf8",
    );
    const buttonTags = src.match(/<Button\b[\s\S]*?>/g) ?? [];
    const iconButtons = buttonTags.filter((tag) =>
      /\bsize=["']icon["']/.test(tag),
    );
    expect(iconButtons.length).toBeGreaterThan(0);
    for (const tag of iconButtons) {
      expect(tag).toMatch(/\baria-label=/);
    }
  });
});
