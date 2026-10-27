import { timingSafeEqual } from "node:crypto";

export function maintenanceSecretMatches(
  provided: string,
  expected: string,
): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
