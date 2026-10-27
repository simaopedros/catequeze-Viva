/**
 * In-process hints that an email belongs to the family portal.
 * Used when building verification emails if request-host ALS is unavailable
 * (e.g. edge cases). Primary signal remains isFamilyPortalRequestContext().
 */
const familyEmails = new Set<string>();

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export function rememberFamilyAuthEmail(email: string | null | undefined): void {
  if (!email || !email.includes('@')) return;
  familyEmails.add(normalize(email));
}

export function isRememberedFamilyAuthEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return familyEmails.has(normalize(email));
}

/** Test helper */
export function clearFamilyAuthEmailHints(): void {
  familyEmails.clear();
}
