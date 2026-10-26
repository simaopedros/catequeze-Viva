import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CatechumenUpdateValidationError,
  parseEmailOrThrow,
} from "../shared/catechumenUpdate";

describe("createCatechumen email validation", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/catechumenOperations.ts"),
    "utf8",
  );

  it("uses parseEmailOrThrow and maps validation errors to HTTP 400", () => {
    const createBlock = ops.slice(
      ops.indexOf("export const createCatechumen"),
      ops.indexOf("export const updateCatechumen"),
    );
    expect(createBlock).toContain("parseEmailOrThrow");
    expect(createBlock).toContain("CatechumenUpdateValidationError");
    expect(createBlock).toContain("HttpError(400");
    expect(createBlock).not.toMatch(/email:\s*args\.email\s*\|\|\s*null/);
  });

  it("rejects invalid email with the same Portuguese message as update", () => {
    expect(() => parseEmailOrThrow("nao-e-email")).toThrow(
      CatechumenUpdateValidationError,
    );
    expect(() => parseEmailOrThrow("nao-e-email")).toThrow(/E-mail inválido/i);
    expect(() => parseEmailOrThrow("a@b")).toThrow(/E-mail inválido/i);
    expect(parseEmailOrThrow("  maria@paroquia.org  ")).toBe(
      "maria@paroquia.org",
    );
    expect(parseEmailOrThrow("")).toBeNull();
    expect(parseEmailOrThrow(undefined)).toBeNull();
  });
});
