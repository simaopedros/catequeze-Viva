/**
 * Reads the `email` claim from a Wasp email verification JWT without verifying
 * it. Only used to prefill the login form; the server still validates the token.
 */
export function emailFromVerificationToken(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    const email = typeof parsed?.email === "string" ? parsed.email.trim() : "";
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

export function loginPathWithEmail(email: string | null): string {
  return email ? `/login?email=${encodeURIComponent(email)}` : "/login";
}

/** Rewrite Wasp auth client links (staff host) to the family portal host. */
export function rewriteClientLinkForFamilyPortal(
  clientLink: string,
  familyHost?: string,
): string | null {
  if (!familyHost) return null;

  try {
    const url = new URL(clientLink);
    url.hostname = familyHost;
    return url.toString();
  } catch {
    return null;
  }
}
