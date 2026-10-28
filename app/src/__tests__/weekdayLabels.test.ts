import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WEEKDAY_FULL_PT,
  WEEKDAY_SHORT_PT,
  isBareWeekdayPt,
} from "../shared/weekdayLabels";

const root = join(process.cwd(), "src");

describe("weekdayLabels", () => {
  it("uses full feira forms Mon–Fri and short chips", () => {
    expect(WEEKDAY_FULL_PT[1]).toBe("Segunda-feira");
    expect(WEEKDAY_FULL_PT[0]).toBe("Domingo");
    expect(WEEKDAY_SHORT_PT[1]).toBe("Seg");
    expect(WEEKDAY_SHORT_PT[6]).toBe("Sáb");
  });

  it("flags bare Segunda/Terça forms", () => {
    expect(isBareWeekdayPt("Segunda")).toBe(true);
    expect(isBareWeekdayPt("Terça")).toBe(true);
    expect(isBareWeekdayPt("Segunda-feira")).toBe(false);
    expect(isBareWeekdayPt("Seg")).toBe(false);
    expect(isBareWeekdayPt("Domingo")).toBe(false);
  });

  it("keeps classes.days and days_long free of bare weekday labels", () => {
    const classes = JSON.parse(
      readFileSync(join(root, "i18n/locales/pt-BR/classes.json"), "utf8"),
    ) as { days: Record<string, string>; days_long: Record<string, string> };
    for (const label of Object.values(classes.days)) {
      expect(isBareWeekdayPt(label), label).toBe(false);
    }
    for (const label of Object.values(classes.days_long)) {
      expect(isBareWeekdayPt(label), label).toBe(false);
    }
  });

  it("keeps onboarding class_setup days on full forms", () => {
    const onboarding = JSON.parse(
      readFileSync(join(root, "i18n/locales/pt-BR/onboarding.json"), "utf8"),
    ) as { class_setup: { days: Record<string, string> } };
    for (const label of Object.values(onboarding.class_setup.days)) {
      expect(isBareWeekdayPt(label), label).toBe(false);
    }
  });
});
