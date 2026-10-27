/**
 * LGPD helpers for server logs and public payloads.
 * Never log full emails or document storage keys of minors.
 */

/** Mask email as j***@d***.com (keeps TLD). */
export function maskEmail(email: string | null | undefined): string {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0 || at === normalized.length - 1) return "***";
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const localVisible = local.slice(0, 1);
  const domainParts = domain.split(".");
  const maskedDomain = domainParts
    .map((part, idx) => {
      if (!part) return "";
      // Keep TLD readable; mask labels
      if (idx === domainParts.length - 1 && domainParts.length > 1) return part;
      return part.slice(0, 1) + "***";
    })
    .join(".");
  return `${localVisible}***@${maskedDomain}`;
}

/**
 * Mask storage keys / filesystem paths for logs.
 * Keeps a short prefix + length so ops can correlate without leaking paths.
 */
export function maskStorageKey(key: string | null | undefined): string {
  const raw = String(key || "").trim();
  if (!raw) return "[empty]";
  if (raw.length <= 8) return "***";
  const prefix = raw.slice(0, 4);
  return `${prefix}…(${raw.length})`;
}

const EMAIL_IN_TEXT_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const EMAIL_CONTEXT_KEYS = /^(to|email|inviteemail|from|recipient|useremail)$/i;
const STORAGE_CONTEXT_KEYS = /^(s3key|storagekey|filepath)$/i;

/** Scrub a logger context object before writing to console. */
export function scrubLogContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    if (typeof v === "string") {
      if (EMAIL_CONTEXT_KEYS.test(k)) {
        out[k] = maskEmail(v);
      } else if (STORAGE_CONTEXT_KEYS.test(k)) {
        out[k] = maskStorageKey(v);
      } else if (EMAIL_IN_TEXT_RE.test(v)) {
        EMAIL_IN_TEXT_RE.lastIndex = 0;
        out[k] = v.replace(EMAIL_IN_TEXT_RE, (m) => maskEmail(m));
      } else {
        out[k] = v;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Scrub emails embedded in free-form log messages. */
export function scrubLogMessage(message: string): string {
  return String(message || "").replace(EMAIL_IN_TEXT_RE, (m) => maskEmail(m));
}
