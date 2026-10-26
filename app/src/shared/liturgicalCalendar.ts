/**
 * Principais celebrações do calendário romano geral, com as transferências
 * para domingo adotadas pela CNBB no Brasil. Não substitui o Diretório
 * Litúrgico: memórias, festas de santos e regras de precedência completas
 * ficam de fora.
 */

export type LiturgicalColor = "white" | "red" | "purple" | "green" | "rose";

export type LiturgicalCelebration = {
  key: string;
  /** YYYY-MM-DD */
  date: string;
  color: LiturgicalColor;
  rank: "solemnity" | "feast" | "season";
};

export const LITURGICAL_COLOR_HEX: Record<LiturgicalColor, string> = {
  white: "#C9A227",
  red: "#B3261E",
  purple: "#6B3FA0",
  green: "#2E7D32",
  rose: "#D86F8E",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Algoritmo gregoriano anônimo (Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

/** Primeiro domingo em ou depois de `date`. */
function sundayOnOrAfter(date: Date): Date {
  return addDays(date, (7 - date.getUTCDay()) % 7);
}

/** Domingo entre 2 e 8 de janeiro (Epifania no Brasil). */
function epiphanySunday(year: number): Date {
  return sundayOnOrAfter(utc(year, 1, 2));
}

/** Transfere para o domingo seguinte quando a data cai em dia de semana. */
function transferToSunday(date: Date): Date {
  return sundayOnOrAfter(date);
}

function firstSundayOfAdvent(year: number): Date {
  const christmas = utc(year, 12, 25);
  const daysBack = christmas.getUTCDay() === 0 ? 7 : christmas.getUTCDay();
  return addDays(christmas, -daysBack - 21);
}

export function liturgicalCelebrations(year: number): LiturgicalCelebration[] {
  const easter = easterSunday(year);
  const advent1 = firstSundayOfAdvent(year);
  const epiphany = epiphanySunday(year);
  // Batismo do Senhor: domingo depois da Epifania; se a Epifania cai em 7 ou 8
  // de janeiro, passa para a segunda-feira seguinte.
  const epiphanyDay = epiphany.getUTCDate();
  const baptism =
    epiphanyDay >= 7 ? addDays(epiphany, 1) : addDays(epiphany, 7);

  const items: LiturgicalCelebration[] = [
    { key: "mary_mother_of_god", date: toKey(utc(year, 1, 1)), color: "white", rank: "solemnity" },
    { key: "epiphany", date: toKey(epiphany), color: "white", rank: "solemnity" },
    { key: "baptism_of_the_lord", date: toKey(baptism), color: "white", rank: "feast" },
    { key: "presentation_of_the_lord", date: toKey(utc(year, 2, 2)), color: "white", rank: "feast" },
    { key: "ash_wednesday", date: toKey(addDays(easter, -46)), color: "purple", rank: "season" },
    { key: "saint_joseph", date: toKey(utc(year, 3, 19)), color: "white", rank: "solemnity" },
    { key: "annunciation", date: toKey(utc(year, 3, 25)), color: "white", rank: "solemnity" },
    { key: "palm_sunday", date: toKey(addDays(easter, -7)), color: "red", rank: "season" },
    { key: "holy_thursday", date: toKey(addDays(easter, -3)), color: "white", rank: "season" },
    { key: "good_friday", date: toKey(addDays(easter, -2)), color: "red", rank: "season" },
    { key: "easter", date: toKey(easter), color: "white", rank: "solemnity" },
    { key: "divine_mercy", date: toKey(addDays(easter, 7)), color: "white", rank: "season" },
    { key: "ascension", date: toKey(addDays(easter, 42)), color: "white", rank: "solemnity" },
    { key: "pentecost", date: toKey(addDays(easter, 49)), color: "red", rank: "solemnity" },
    { key: "holy_trinity", date: toKey(addDays(easter, 56)), color: "white", rank: "solemnity" },
    { key: "corpus_christi", date: toKey(addDays(easter, 60)), color: "white", rank: "solemnity" },
    { key: "sacred_heart", date: toKey(addDays(easter, 68)), color: "white", rank: "solemnity" },
    { key: "peter_and_paul", date: toKey(transferToSunday(utc(year, 6, 29))), color: "red", rank: "solemnity" },
    { key: "assumption", date: toKey(transferToSunday(utc(year, 8, 15))), color: "white", rank: "solemnity" },
    { key: "our_lady_aparecida", date: toKey(utc(year, 10, 12)), color: "white", rank: "solemnity" },
    { key: "all_saints", date: toKey(transferToSunday(utc(year, 11, 1))), color: "white", rank: "solemnity" },
    { key: "all_souls", date: toKey(utc(year, 11, 2)), color: "purple", rank: "feast" },
    { key: "christ_the_king", date: toKey(addDays(advent1, -7)), color: "white", rank: "solemnity" },
    { key: "advent_1", date: toKey(advent1), color: "purple", rank: "season" },
    { key: "advent_2", date: toKey(addDays(advent1, 7)), color: "purple", rank: "season" },
    { key: "advent_3", date: toKey(addDays(advent1, 14)), color: "rose", rank: "season" },
    { key: "advent_4", date: toKey(addDays(advent1, 21)), color: "purple", rank: "season" },
    { key: "immaculate_conception", date: toKey(utc(year, 12, 8)), color: "white", rank: "solemnity" },
    { key: "christmas", date: toKey(utc(year, 12, 25)), color: "white", rank: "solemnity" },
  ];

  return items.sort((a, b) => a.date.localeCompare(b.date));
}
