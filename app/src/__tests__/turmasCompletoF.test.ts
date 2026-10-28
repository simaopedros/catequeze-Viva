import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function readLocale(path: string) {
  return JSON.parse(read(`i18n/locales/${path}`));
}

describe("turmas completo PR F", () => {
  it("allows editing meeting title and date on MeetingDetailPage", () => {
    const page = read("catequese/pages/MeetingDetailPage.tsx");
    expect(page).toContain("saveMeetingEdit");
    expect(page).toContain("edit_meeting");
    expect(page).toContain("updateMeeting({");
    expect(page).toMatch(/title:\s*editTitle/);
    expect(page).toMatch(/date:\s*editDate/);
  });

  it("sets endedAt on cancelEnrollment and filters ranking by enrollment window", () => {
    const ops = read("server/operations/classOperations.ts");
    expect(ops).toContain("endedAt: new Date()");
    const pastoral = read("server/operations/pastoralReportOperations.ts");
    expect(pastoral).toContain("enrollmentCoversMeetingDate");
    const reportPage = read("catequese/pages/ClassPastoralReportPage.tsx");
    expect(reportPage).toContain('t("name")');
    expect(reportPage).not.toContain('tc("name")');
  });

  it("exposes duplicate, archive, restore, reopen and CSV export on class detail", () => {
    const page = read("catequese/pages/ClassDetailPage.tsx");
    expect(page).toContain("duplicateClass");
    expect(page).toContain("archiveClass");
    expect(page).toContain("handleExportRosterCsv");
    expect(page).toContain("handleExportAttendanceCsv");
    expect(page).toContain("window.print");
    expect(page).toContain("confirm_archive_desc");
    expect(page).toContain('t("detail.reopen")');
    expect(page).toContain("catechumens/new?classId=");
  });

  it("loads next upcoming meeting in listClasses include", () => {
    const ops = read("server/operations/classOperations.ts");
    expect(ops).toContain("function classListInclude");
    expect(ops).toContain("startOfAppCalendarDay(now)");
    expect(ops).toContain("date: { gte: dayStart }");
    expect(ops).not.toContain("date: { gte: now }");
    expect(ops).toContain("include: classListInclude()");
  });

  it("preselects classId on create catechumen and keeps class field", () => {
    const page = read("catequese/pages/CreateCatechumenPage.tsx");
    expect(page).toContain('searchParams.get("classId")');
    expect(page).toContain("catechumen-class");
    expect(page).toContain("redirecting");
    expect(page).toContain("created_success");
  });

  it("uses tabela instead of grelha in pt-BR classes copy", () => {
    const pt = readLocale("pt-BR/classes.json");
    expect(pt.view_grid).toBe("Ver como tabela");
    expect(String(pt.view_grid).toLowerCase()).not.toContain("grelha");
  });

  it("adds scroll fade helpers for turmas tabs and filters", () => {
    expect(read("client/components/DetailTabs.tsx")).toContain(
      "HorizontalScrollFade",
    );
    expect(read("client/components/FilterPills.tsx")).toContain(
      "HorizontalScrollFade",
    );
    expect(read("client/components/HorizontalScrollFade.tsx")).toContain(
      "scrollIntoView",
    );
  });

  it("declares duplicateClass action in main.wasp", () => {
    const wasp = readFileSync(join(process.cwd(), "main.wasp"), "utf8");
    expect(wasp).toContain("action duplicateClass");
  });
});
