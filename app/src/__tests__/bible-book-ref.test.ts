import { describe, expect, it } from "vitest";
import { bibleBookMatchesRef } from "../shared/bibleBookRef";

describe("bibleBookMatchesRef", () => {
  const john = { name: "São João", abbreviation: "Jo" };

  it("matches the stored name and abbreviation", () => {
    expect(bibleBookMatchesRef(john, "São João")).toBe(true);
    expect(bibleBookMatchesRef(john, "Jo")).toBe(true);
  });

  it("matches João without the São prefix used in deep-links", () => {
    expect(bibleBookMatchesRef(john, "João")).toBe(true);
    expect(bibleBookMatchesRef(john, "joão")).toBe(true);
  });

  it("does not match a different book", () => {
    expect(bibleBookMatchesRef(john, "Mateus")).toBe(false);
    expect(bibleBookMatchesRef(john, "")).toBe(false);
  });
});
