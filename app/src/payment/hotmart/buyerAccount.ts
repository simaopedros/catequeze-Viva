const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/** Trim and lowercase. Empty input becomes null. */
export function normalizeBuyerEmail(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email || null;
}

export function isValidBuyerEmail(email: string): boolean {
  if (email.length > 254) return false;
  return EMAIL_RE.test(email);
}

function cleanName(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hotmart sends a full name. When it is missing, the local part of the email
 * is the display name so the account is never created without a first name.
 */
export function splitBuyerName(
  name: string | null | undefined,
  email: string,
): { firstName: string; lastName: string | null } {
  const provided = cleanName(name || "");
  const local = cleanName((email.split("@")[0] || "").replace(/[._+-]+/g, " "));
  const source = provided || local || "Catequista";
  const [first, ...rest] = source.split(" ");
  const lastName = rest.join(" ").slice(0, 80) || null;
  return { firstName: (first || "Catequista").slice(0, 80), lastName };
}

/** A stored hash the buyer can actually log in with. Markers are not passwords. */
export function hasUsablePassword(hashedPassword: unknown): boolean {
  return (
    typeof hashedPassword === "string" &&
    hashedPassword.length > 0 &&
    !hashedPassword.startsWith("unset.")
  );
}
