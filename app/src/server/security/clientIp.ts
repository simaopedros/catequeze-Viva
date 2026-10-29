/**
 * Use the IP resolved by Express, then the socket address.
 * Caddy must sanitize forwarding headers and resolve Cloudflare client IPs
 * only for trusted Cloudflare peers. Never read raw IP headers here.
 * Node must remain private behind the single trusted Caddy hop.
 */

type HeaderBag = string | string[] | undefined;

export type IpRequestLike = {
  ip?: string;
  headers?: Record<string, HeaderBag>;
  socket?: { remoteAddress?: string };
};

function normalizeIp(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // Express / Node often prefix IPv4-mapped addresses
  return trimmed.replace(/^::ffff:/i, "");
}

/** Extract client IP from an Express-like request. */
export function getClientIpFromRequest(req?: IpRequestLike | null): string {
  if (!req) return "unknown";

  const fromReqIp = normalizeIp(req.ip);
  if (fromReqIp) return fromReqIp;

  return normalizeIp(req.socket?.remoteAddress) || "unknown";
}
