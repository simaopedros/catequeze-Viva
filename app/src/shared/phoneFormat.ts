/**
 * Phone display/normalization helpers shared by UI mask and validation tests.
 * Brazilian national numbers use (DD) masks; values starting with + stay
 * international (E.164 digit length) without BR regrouping.
 */

export function formatBrazilianPhone(digits: string): string {
  const limited = digits.replace(/\D/g, "").slice(0, 11);
  const len = limited.length;
  if (len <= 2) return limited;
  if (len <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  if (len <= 10) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
}

export function isInternationalPhoneInput(value: string): boolean {
  return value.trimStart().startsWith("+");
}

/**
 * Keep leading +, allow light separators, cap at 15 digits (E.164).
 * Does not apply Brazilian DDD grouping.
 */
export function formatInternationalPhone(raw: string): string {
  const stripped = raw.trimStart().replace(/^\++/, "");
  const cleaned = stripped.replace(/[^\d\s\-()]/g, "");
  const digits = cleaned.replace(/\D/g, "").slice(0, 15);
  let digitIdx = 0;
  let out = "+";
  for (const ch of cleaned) {
    if (/\d/.test(ch)) {
      if (digitIdx >= digits.length) break;
      out += digits[digitIdx++];
    } else if (digitIdx < digits.length) {
      out += ch;
    }
  }
  while (digitIdx < digits.length) {
    out += digits[digitIdx++];
  }
  return out === "+" ? "+" : out;
}

/** Normalize typed value the same way PhoneMaskInput does. */
export function normalizePhoneInput(raw: string): string {
  if (isInternationalPhoneInput(raw)) {
    return formatInternationalPhone(raw);
  }
  return formatBrazilianPhone(raw);
}
