import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function readLocaleJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(root, "i18n/locales", relativePath), "utf8"),
  ) as Record<string, unknown>;
}

describe("turmas média polish", () => {
  it("renames presence matrix heading to plain language", () => {
    const pt = readLocaleJson("pt-BR/attendance.json") as {
      matrix: { title: string; all_statuses: string };
    };
    expect(pt.matrix.title).toBe("Chamada da turma");
    expect(pt.matrix.title).not.toMatch(/Matriz/i);
    expect(pt.matrix.all_statuses).toBe("Todas as situações");
    expect(pt.matrix.all_statuses).not.toMatch(/status/i);
  });

  it("keeps en/es attendance titles free of matrix jargon", () => {
    const en = readLocaleJson("en/attendance.json") as {
      matrix: { title: string; all_statuses: string };
    };
    const es = readLocaleJson("es/attendance.json") as {
      matrix: { title: string; all_statuses: string };
    };
    expect(en.matrix.title.toLowerCase()).not.toContain("matrix");
    expect(es.matrix.title.toLowerCase()).not.toContain("matriz");
    expect(en.matrix.all_statuses.toLowerCase()).not.toContain("status");
  });

  it("uses skeleton loading with sr-only Carregando on turmas screens", () => {
    const classesPage = readFileSync(
      join(root, "catequese/pages/ClassesPage.tsx"),
      "utf8",
    );
    const detailPage = readFileSync(
      join(root, "catequese/pages/ClassDetailPage.tsx"),
      "utf8",
    );
    const attendancePage = readFileSync(
      join(root, "catequese/pages/AttendancePage.tsx"),
      "utf8",
    );
    expect(classesPage).toContain('aria-busy="true"');
    expect(classesPage).toContain('tc("loading_sr")');
    expect(detailPage).toContain("SkeletonPage");
    expect(detailPage).toContain('tc("loading_sr")');
    expect(attendancePage).toContain("SkeletonTable");
    expect(attendancePage).toContain('tc("loading_sr")');
    expect(attendancePage).not.toMatch(
      /classLoading \|\| matrixLoading[\s\S]{0,200}Aguarde/,
    );
  });

  it("puts class card menu actions beyond Detalhes", () => {
    const page = readFileSync(
      join(root, "catequese/pages/ClassesPage.tsx"),
      "utf8",
    );
    expect(page).toContain('to={`/app/classes/${cls.id}?edit=1`}');
    expect(page).toContain("/attendance");
    expect(page).toContain("t(\"detail.edit\")");
    expect(page).toContain("t(\"details\")");
    expect(page).toContain("t(\"attendance\")");
  });

  it("keeps Presença primary and folds the rest into Mais on mobile", () => {
    const detail = readFileSync(
      join(root, "catequese/pages/ClassDetailPage.tsx"),
      "utf8",
    );
    const overflow = readFileSync(
      join(root, "client/components/brand/AppPageHeaderOverflowMenu.tsx"),
      "utf8",
    );
    const chrome = readFileSync(
      join(root, "client/components/brand/AppChrome.tsx"),
      "utf8",
    );
    expect(detail).toContain("primaryAction");
    expect(detail).toContain('label: t("attendance")');
    expect(detail).toContain('label: t("detail.edit")');
    expect(detail).toContain("destructive: s.status === \"CONCLUDED\"");
    expect(chrome).toContain('label={t("more")}');
    expect(overflow).toContain("{label}");
    expect(detail).toContain('searchParams.get("edit")');
  });

  it("does not truncate encounter titles in the attendance matrix header", () => {
    const page = readFileSync(
      join(root, "catequese/pages/AttendancePage.tsx"),
      "utf8",
    );
    expect(page).toContain("whitespace-normal break-words");
    expect(page).toContain("formatAttendancePercentDisplay");
    expect(page).not.toMatch(
      /max-w-\[80px\] truncate text-overline[\s\S]{0,40}m\.title/,
    );
  });

  it("exposes loading_sr as Carregando in pt-BR", () => {
    const common = readLocaleJson("pt-BR/common.json");
    expect(common.loading_sr).toBe("Carregando");
  });
});
