/**
 * Resolve the real client IP behind Caddy + Cloudflare.
 * Prefer CF-Connecting-IP (set by Cloudflare), then the first X-Forwarded-For
 * hop (trusted when Express trust proxy is enabled), then req.ip / socket.
 */

type HeaderBag = string | string[] | undefined;

export type IpRequestLike = {
  ip?: string;
  headers?: Record<string, HeaderBag>;
  socket?: { remoteAddress?: string };
};

function firstHeader(value: HeaderBag): string | undefined {
  if (typeof value === "string") {
    return value.split(",")[0]?.trim() || undefined;
  }
  if (Array.isArray(value) && value[0]) {
    return String(value[0]).split(",")[0]?.trim() || undefined;
  }
  return undefined;
}

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

  const headers = req.headers || {};
  const fromCf = normalizeIp(firstHeader(headers["cf-connecting-ip"]));
  if (fromCf) return fromCf;

  const fromXff = normalizeIp(firstHeader(headers["x-forwarded-for"]));
  if (fromXff) return fromXff;

  const fromReal = normalizeIp(firstHeader(headers["x-real-ip"]));
  if (fromReal) return fromReal;

  const fromReqIp = normalizeIp(req.ip);
  if (fromReqIp) return fromReqIp;

  return normalizeIp(req.socket?.remoteAddress) || "unknown";
}
