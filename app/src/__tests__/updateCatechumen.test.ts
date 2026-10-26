/**
 * Regression: updateCatechumen 500'd because main.wasp omitted GuardianProfile
 * (and workspace-scope entities) required by assertCanAccessCatechumenProfile.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCatechumenUpdateData,
  CatechumenUpdateValidationError,
} from "../shared/catechumenUpdate";

function entitiesForAction(waspSource: string, actionName: string): string[] {
  const re = new RegExp(
    `action\\s+${actionName}\\s*\\{[\\s\\S]*?entities:\\s*\\[([^\\]]+)\\]`,
    "m",
  );
  const match = waspSource.match(re);
  if (!match) {
    throw new Error(`action ${actionName} not found in main.wasp`);
  }
  return match[1]
    .split(",")
    .map((part) => part.replace(/\/\/.*$/gm, "").trim())
    .filter(Boolean);
}

describe("updateCatechumen entities", () => {
  const waspSource = readFileSync(
    resolve(__dirname, "../../main.wasp"),
    "utf8",
  );

  it("declares GuardianProfile and workspace-scope entities used on edit", () => {
    const entities = entitiesForAction(waspSource, "updateCatechumen");
    for (const required of [
      "CatechumenProfile",
      "Membership",
      "Parish",
      "GuardianProfile",
      "ClassEnrollment",
      "ClassCatechist",
      "CatechesisClass",
      "Household",
    ]) {
      expect(entities).toContain(required);
    }
  });
});

describe("buildCatechumenUpdateData", () => {
  it("whitelists and normalizes editable fields", () => {
    const data = buildCatechumenUpdateData({
      id: "ignored",
      firstName: "  Maria ",
      lastName: " Silva",
      birthDate: "2014-05-10",
      photoUrl: "data:image/jpeg;base64,abc",
      householdId: "hh-1",
      evilField: "drop table",
    });
    expect(data).toEqual({
      firstName: "Maria",
      lastName: "Silva",
      birthDate: new Date(Date.UTC(2014, 4, 10, 12, 0, 0)),
      photoUrl: "data:image/jpeg;base64,abc",
      householdId: "hh-1",
    });
    expect(data).not.toHaveProperty("evilField");
    expect(data).not.toHaveProperty("id");
  });

  it("allows clearing optional fields and linking household to null", () => {
    expect(
      buildCatechumenUpdateData({
        birthDate: "",
        photoUrl: "",
        householdId: null,
        email: "",
      }),
    ).toEqual({
      birthDate: null,
      photoUrl: null,
      householdId: null,
      email: null,
    });
  });

  it("rejects blank names and bad dates", () => {
    expect(() => buildCatechumenUpdateData({ firstName: "  " })).toThrow(
      CatechumenUpdateValidationError,
    );
    expect(() =>
      buildCatechumenUpdateData({ birthDate: "not-a-date" }),
    ).toThrow(CatechumenUpdateValidationError);
  });
});
