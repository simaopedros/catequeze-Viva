/** Resend rejects tag names/values outside [A-Za-z0-9_-] and longer than 256 chars. */
export const RESEND_TAG_MAX_LENGTH = 256;

export type ResendTag = { name: string; value: string };

export function sanitizeResendTagPart(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[.\s]+/g, "_")
    .replace(/[^A-Za-z0-9_-]+/g, "")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, RESEND_TAG_MAX_LENGTH);
}

/** Drops tags that end up empty and keeps the first tag for each sanitized name. */
export function sanitizeResendTags(
  tags?: Record<string, string | null | undefined>,
): ResendTag[] | undefined {
  if (!tags) return undefined;
  const seen = new Set<string>();
  const result: ResendTag[] = [];
  for (const [rawName, rawValue] of Object.entries(tags)) {
    const name = sanitizeResendTagPart(rawName);
    const value = sanitizeResendTagPart(rawValue);
    if (!name || !value || seen.has(name)) continue;
    seen.add(name);
    result.push({ name, value });
  }
  return result.length ? result : undefined;
}
