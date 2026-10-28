import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("mobile geral polish (PR G)", () => {
  it("stacks journey template title above sacrament badge with 44px icon targets", () => {
    const page = readSrc("catequese/pages/JourneyTemplatesPage.tsx");
    expect(page).toContain("flex min-w-0 flex-wrap items-center gap-1.5");
    expect(page).toContain("tmpl.sacrament.name");
    expect(page).toMatch(
      /size="icon"[\s\S]{0,120}h-11 w-11 min-h-11 min-w-11 md:h-8/,
    );
    expect(page).toContain('aria-label={t("templates.aria_edit")}');
    expect(page).toContain('aria-label={t("templates.aria_copy")}');
  });

  it("enlarges mobile touch targets on bible, directory, catechism, sacraments", () => {
    const bible = readSrc("catequese/pages/BiblePage.tsx");
    expect(bible).toContain(
      "min-h-11 truncate rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted md:min-h-0",
    );
    expect(bible).toContain(
      "h-11 min-h-11 w-full rounded-sm border border-input bg-background pl-8 pr-3 text-sm md:h-8 md:min-h-0 md:text-xs",
    );

    const directory = readSrc("catequese/pages/DirectoryPage.tsx");
    expect(directory).toContain(
      "inline-flex min-h-11 items-center rounded-sm border border-border/70 bg-muted/30",
    );
    expect(directory).toContain(
      "inline-flex min-h-11 items-center rounded-sm px-3 py-1.5 text-sm transition-colors md:min-h-8",
    );
    expect(directory).toContain(
      "h-11 min-h-11 flex-1 rounded-sm border border-input bg-background px-3 text-sm md:h-9 md:min-h-0",
    );

    const catechism = readSrc("catequese/pages/CatechismPage.tsx");
    expect(catechism).toContain(
      "inline-flex min-h-11 items-center rounded-sm px-3 py-1.5 text-sm transition-colors md:min-h-8",
    );

    const sacraments = readSrc("catequese/pages/SacramentsPage.tsx");
    expect(sacraments).toContain(
      "h-11 min-h-11 gap-1 text-xs md:h-7 md:min-h-0",
    );
    expect(sacraments).toContain(
      "flex h-11 min-h-11 w-40 rounded-sm border border-input bg-background pl-9 pr-3 text-sm md:h-9 md:min-h-0",
    );
  });

  it("grows breadcrumbs, messages chips, settings and avatar buttons on mobile only", () => {
    const crumbs = readSrc("catequese/components/Breadcrumbs.tsx");
    expect(crumbs).toContain(
      "flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center",
    );
    expect(crumbs).toContain("md:min-h-8 md:min-w-8");

    const messages = readSrc(
      "catequese/components/messages/ConversationList.tsx",
    );
    expect(messages).toContain(
      "min-h-11 shrink-0 whitespace-nowrap rounded-sm px-2.5 py-1.5",
    );
    expect(messages).toContain("bg-gradient-to-l from-surface-elevated");
    expect(messages).toContain("pr-8");

    const settings = readSrc("catequese/pages/SettingsPage.tsx");
    expect(settings).toContain("min-h-11 rounded-md md:min-h-9");

    const avatar = readSrc("catequese/components/ProfileAvatarPicker.tsx");
    expect(avatar).toContain('className="min-h-11 md:min-h-9"');
  });

  it("pads bottom sheet with safe-area and hides Ctrl+K on mobile search", () => {
    const sheet = readSrc("catequese/components/BottomSheetNav.tsx");
    expect(sheet).toContain(
      "pb-[calc(1rem+env(safe-area-inset-bottom,0px))]",
    );

    const mobileSearch = readSrc(
      "catequese/components/MobileSearchDialog.tsx",
    );
    expect(mobileSearch).toContain('t("searchTypeHint")');
    expect(mobileSearch).not.toContain('t("searchFocusHint")');

    const topbar = readSrc("catequese/TopBar.tsx");
    expect(topbar).toContain("hidden sm:inline");
    expect(topbar).toContain('tTop("searchFocusHint")');
  });

  it("enlarges dashboard see_all targets and softens card subtitle truncation", () => {
    for (const file of [
      "catequese/components/dashboard/NextActionsPanel.tsx",
      "catequese/components/dashboard/MyClassesCard.tsx",
      "catequese/components/dashboard/RecentMeetingsList.tsx",
      "catequese/components/dashboard/UpcomingBirthdaysCard.tsx",
    ]) {
      const src = readSrc(file);
      expect(src).toContain(
        "inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-brand-ink",
      );
    }

    const next = readSrc("catequese/components/dashboard/NextActionsPanel.tsx");
    expect(next).toContain(
      "line-clamp-2 text-sm font-medium text-brand-ink/80",
    );
    expect(next).not.toMatch(
      /truncate text-sm font-medium text-brand-ink\/80/,
    );

    const recent = readSrc(
      "catequese/components/dashboard/RecentMeetingsList.tsx",
    );
    expect(recent).toContain("line-clamp-2");
  });

  it("raises documents missing label above micro and fades filter pill overflow", () => {
    const docs = readSrc("catequese/pages/DocumentsPage.tsx");
    expect(docs).toContain(
      "flex-shrink-0 text-xs italic text-muted-foreground",
    );
    expect(docs).not.toMatch(
      /status_missing[\s\S]{0,80}text-micro|text-micro[\s\S]{0,80}status_missing/,
    );

    const pills = readSrc("client/components/FilterPills.tsx");
    expect(pills).toContain("HorizontalScrollFade");
    expect(pills).toContain("min-h-11 sm:min-h-0");
    const fade = readSrc("client/components/HorizontalScrollFade.tsx");
    expect(fade).toContain("bg-gradient-to-l from-background");
  });

  it("keeps pt-BR/en/es aria and searchTypeHint keys in sync", () => {
    const ptSacraments = JSON.parse(
      readSrc("i18n/locales/pt-BR/sacraments.json"),
    );
    const enSacraments = JSON.parse(readSrc("i18n/locales/en/sacraments.json"));
    const esSacraments = JSON.parse(readSrc("i18n/locales/es/sacraments.json"));
    for (const locale of [ptSacraments, enSacraments, esSacraments]) {
      expect(locale.templates.aria_edit).toBeTruthy();
      expect(locale.templates.aria_copy).toBeTruthy();
      expect(locale.templates.aria_publish).toBeTruthy();
      expect(locale.templates.aria_expand).toBeTruthy();
      expect(locale.templates.aria_collapse).toBeTruthy();
    }
    expect(ptSacraments.templates.aria_copy).toBe("Duplicar modelo");

    const ptTop = JSON.parse(readSrc("i18n/locales/pt-BR/topbar.json"));
    const enTop = JSON.parse(readSrc("i18n/locales/en/topbar.json"));
    const esTop = JSON.parse(readSrc("i18n/locales/es/topbar.json"));
    expect(ptTop.searchTypeHint).toMatch(/3 letras/i);
    expect(enTop.searchTypeHint).toMatch(/3 letters/i);
    expect(esTop.searchTypeHint).toMatch(/3 letras/i);
    expect(ptTop.searchTypeHint).not.toMatch(/Ctrl/i);
  });
});
