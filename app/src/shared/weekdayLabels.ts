/**
 * Weekday display rule:
 * - Full names in headings, detail, and forms ("Segunda-feira" … "Domingo")
 * - Abbreviated ("Seg", "Ter"…) only in tight chips
 * - Never bare "Segunda" / "Terça" without "-feira"
 */

export const WEEKDAY_FULL_PT: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export const WEEKDAY_SHORT_PT: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

/** True when a pt-BR weekday label is the forbidden bare form (e.g. "Segunda"). */
export function isBareWeekdayPt(label: string): boolean {
  const trimmed = label.trim();
  return /^(Segunda|Terça|Quarta|Quinta|Sexta)$/i.test(trimmed);
}
