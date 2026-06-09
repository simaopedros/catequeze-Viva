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
