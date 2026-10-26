/** Local calendar YYYY-MM-DD for today (browser/server local TZ). */
export function todayDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

/** True when value is a YYYY-MM-DD on or before today. Empty is allowed. */
export function isBirthDateAllowed(
  value: string | null | undefined,
  now = new Date(),
): boolean {
  if (!value) return true;
  const key = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return key <= todayDateKey(now);
}

/** Digits-only length check for optional phone fields (BR mobile/landline). */
export function isPhoneAllowed(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}
