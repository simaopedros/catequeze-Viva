import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  countActiveClasses,
  countActiveStatusClasses,
} from "../shared/classPlanLimit";
import {
  computeAttendanceRate,
  emptyAttendanceCounts,
  addStatus,
} from "../shared/attendanceMetrics";

const root = (...parts: string[]) => resolve(__dirname, "..", ...parts);

describe("audit alta E — família no dropdown", () => {
  it("create/edit catechumen and invites pass parishId to listHouseholds", () => {
    for (const file of [
      "catequese/pages/CreateCatechumenPage.tsx",
      "catequese/pages/EditCatechumenPage.tsx",
      "catequese/pages/FamilyPortalInvitesPage.tsx",
    ]) {
      const src = readFileSync(root(file), "utf8");
      expect(src).toContain("listHouseholds");
      expect(src).toMatch(/parishId:\s*activeParishId/);
      expect(src).toMatch(/enabled:\s*Boolean\(activeParishId\)/);
    }
  });

  it("catechist listHouseholds includes empty parish households for the picker", () => {
    const ops = readFileSync(
      root("server/operations/familyOperations.ts"),
      "utf8",
    );
    const start = ops.indexOf("// Catechist: households");
    const block = ops.slice(start, start + 1600);
    expect(block).toContain("catechumens: { none: {} }");
    expect(block).toContain("OR: orClauses");
  });
});

describe("audit alta E — filtro catequizandos", () => {
  it("does not reset accumulated pages when only classFilter changes", () => {
    const src = readFileSync(
      root("catequese/pages/CatechumensPage.tsx"),
      "utf8",
    );
    const effectIdx = src.indexOf("}, [serverSearch, activeParishId]);");
    expect(effectIdx).toBeGreaterThan(-1);
    expect(src).not.toMatch(
      /setItems\(\[\]\);[\s\S]{0,200}\}, \[debouncedSearch, classFilter/,
    );
  });
});

describe("audit alta E — contagens unificadas", () => {
  it("countActiveStatusClasses counts only ACTIVE; plan limit stays non-archived", () => {
    const classes = [
      { status: "ACTIVE" },
      { status: "ACTIVE" },
      { status: "PAUSED" },
      { status: "CONCLUDED" },
      { status: "ARCHIVED" },
      { status: "DRAFT" },
    ];
    expect(countActiveStatusClasses(classes)).toBe(2);
    expect(countActiveClasses(classes)).toBe(5);
  });

  it("listClasses and reports count only ENROLLED enrollments with a profile", () => {
    const classOps = readFileSync(
      root("server/operations/classOperations.ts"),
      "utf8",
    );
    expect(classOps).toMatch(
      /enrollments:\s*\{\s*where:\s*\{\s*status:\s*"ENROLLED",\s*catechumenProfileId:\s*\{\s*not:\s*null\s*\}/,
    );

    const reportOps = readFileSync(
      root("server/operations/reportOperations.ts"),
      "utf8",
    );
    expect(reportOps).toContain("status: { not: 'ARCHIVED' }");
    expect(reportOps).toMatch(/status:\s*'ENROLLED'/);
    expect(reportOps).toContain("catechumenProfileId: { not: null }");

    const listCatechumens = readFileSync(
      root("server/operations/catechumenOperations.ts"),
      "utf8",
    );
    const start = listCatechumens.indexOf("enrollments: {");
    const block = listCatechumens.slice(start, start + 350);
    expect(block).toContain('where: { status: "ENROLLED" }');
  });

  it("dashboard attendance uses PRESENT+LATE+JUSTIFIED like reports", () => {
    const dash = readFileSync(
      root("server/operations/dashboardOperations.ts"),
      "utf8",
    );
    expect(dash).toContain('status: { in: ["PRESENT", "LATE", "JUSTIFIED"] }');
    expect(dash).toContain('status: { not: "ARCHIVED" }');
  });
});

describe("audit alta E — relatórios e presença", () => {
  it("attendanceRate matches shared participation rule", () => {
    const counts = emptyAttendanceCounts();
    addStatus(counts, "PRESENT");
    addStatus(counts, "LATE");
    addStatus(counts, "ABSENT");
    addStatus(counts, "ABSENT");
    expect(computeAttendanceRate(counts)).toBe(50);
  });

  it("reports keep classes without meetings in the period instead of dropping them", () => {
    const reportOps = readFileSync(
      root("server/operations/reportOperations.ts"),
      "utf8",
    );
    expect(reportOps).not.toContain("classesInPeriod");
    expect(reportOps).toContain(
      "Keep every class in the list; period only affects the attendance window.",
    );
  });
});

describe("audit alta E — calendário overlay", () => {
  it("agenda opens meetings via source=meeting and avoids desktop sheet trap", () => {
    const src = readFileSync(root("catequese/pages/CalendarPage.tsx"), "utf8");
    expect(src).toContain('source: "meeting"');
    expect(src).toContain('e.source === "meeting"');
    expect(src).toContain("isDesktopViewport()");
    expect(src).toContain('setViewMode("month")');
    // Sheet content must remain usable (no lg:hidden that leaves only overlay)
    const sheetStart = src.indexOf("Mobile day panel");
    const sheetBlock = src.slice(sheetStart, sheetStart + 900);
    expect(sheetBlock).not.toContain("lg:hidden");
  });
});
