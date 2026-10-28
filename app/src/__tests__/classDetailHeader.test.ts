import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

/** Mirrors classOperations.startOfUtcDay — meeting dates are midnight UTC. */
function startOfUtcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

describe("class detail header layout", () => {
  it("keeps title full-width with actions below and Mais ações menu", () => {
    const page = read("catequese/pages/ClassDetailPage.tsx");
    const chrome = read("client/components/brand/AppChrome.tsx");

    expect(page).toContain('actionsLayout="below"');
    expect(page).toContain("menuActions={[");
    expect(page).toContain('label: t("attendance")');
    expect(page).toContain('label: t("detail.edit")');
    expect(chrome).toContain('actionsLayout?: "beside" | "below"');
    expect(chrome).toContain("menuActions");
    expect(chrome).toContain("min-w-0 w-full");
    expect(chrome).toContain("flex-wrap");
  });

  it("exports/print only once (in menuActions, not a second button row)", () => {
    const page = read("catequese/pages/ClassDetailPage.tsx");

    const rosterMatches = page.match(/t\("export_roster_csv"\)/g) ?? [];
    const attendanceMatches =
      page.match(/t\("export_attendance_csv"\)/g) ?? [];
    const printMatches = page.match(/t\("print"\)/g) ?? [];

    // One label reference each for the menu action (handlers may mention keys too)
    expect(rosterMatches.length).toBe(1);
    expect(attendanceMatches.length).toBe(1);
    expect(printMatches.length).toBe(1);

    // Duplicate toolbar with Download/Printer icons removed
    expect(page).not.toMatch(/\bDownload\b/);
    expect(page).not.toMatch(/\bPrinter\b/);
    expect(page).toContain("SendAnnouncementButton");
    expect(page).toContain("handleExportRosterCsv");
    expect(page).toContain("handleExportAttendanceCsv");
    expect(page).toContain("window.print");
  });

  it("puts secondary tools in menuActions, not as visible secondaryActions", () => {
    const page = read("catequese/pages/ClassDetailPage.tsx");

    const secondaryBlock = page.slice(
      page.indexOf("secondaryActions={["),
      page.indexOf("menuActions={["),
    );
    const menuBlock = page.slice(
      page.indexOf("menuActions={["),
      page.indexOf("/>", page.indexOf("menuActions={[")),
    );

    expect(secondaryBlock).toContain('t("detail.edit")');
    expect(secondaryBlock).not.toContain("export_roster_csv");
    expect(secondaryBlock).not.toContain("duplicate");
    expect(menuBlock).toContain("export_roster_csv");
    expect(menuBlock).toContain("export_attendance_csv");
    expect(menuBlock).toContain('t("print")');
    expect(menuBlock).toContain('t("duplicate")');
    expect(menuBlock).toContain("indicators");
    expect(menuBlock).toContain("detail.chat");
  });
});

describe("class list next meeting day boundary", () => {
  it("includes a midnight-UTC meeting on the same UTC day after evening BRT", () => {
    // 27/10 21:30 BRT = 28/10 00:30 UTC; meeting stored as 28/10 00:00 UTC
    const now = new Date("2026-10-28T00:30:00.000Z");
    const meetingDate = new Date("2026-10-28T00:00:00.000Z");
    const dayStart = startOfUtcDay(now);

    expect(meetingDate >= now).toBe(false);
    expect(meetingDate >= dayStart).toBe(true);
    expect(dayStart.toISOString()).toBe("2026-10-28T00:00:00.000Z");
  });

  it("uses startOfUtcDay in classListInclude filter", () => {
    const ops = read("server/operations/classOperations.ts");
    expect(ops).toContain("const dayStart = startOfUtcDay(now)");
    expect(ops).toContain("date: { gte: dayStart }");
    expect(ops).toContain('status: { not: "CANCELLED" as const }');
  });
});
