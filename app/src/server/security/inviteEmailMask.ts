/** Mask invitee email for public invite payloads (local + domain). */
export function maskInviteEmail(email: string): string {
  const normalized = String(email || "").trim().toLowerCase();
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
