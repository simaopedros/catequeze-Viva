import { createHash } from "node:crypto";
import { HttpError } from "wasp/server";
import { getRequestClientIp } from "../requestPortalContext";
import { getClientIpFromRequest } from "./clientIp";

export function isUploadTokenValid(
  expires: Date | string | null | undefined,
): boolean {
  return !!expires && new Date(expires).getTime() > Date.now();
}

// Per-process, bounded buckets. Hash tokens so capabilities are never retained.
const buckets = new Map<string, { count: number; resetAt: number }>();
export function assertPublicTokenRateLimit(token: string, context: any): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  const hash = createHash("sha256")
    .update(typeof token === "string" ? token : "")
    .digest("hex");
  const fromAls = getRequestClientIp();
  const ip =
    fromAls !== "unknown"
      ? fromAls
      : getClientIpFromRequest(context?.req ?? context?.request);
  const keys = [`token:${hash}`, `ip:${ip}`];
  for (const key of keys) {
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= 10000)
        throw new HttpError(429, "Muitas requisições. Aguarde 1 minuto.");
      bucket = { count: 0, resetAt: now + 60000 };
      buckets.set(key, bucket);
    }
    if (++bucket.count > 60)
      throw new HttpError(429, "Muitas requisições. Aguarde 1 minuto.");
  }
}
