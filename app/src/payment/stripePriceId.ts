/**
 * Stripe Price ID helpers — shared by checkout (require) and tests.
 *
 * Placeholders from env examples (`price_...`, empty string) must never
 * reach Stripe Checkout: the API returns `parameter_invalid_empty` / 
 * `No such price` which surface as HTTP 500 on generate-checkout-session.
 */

const USABLE_STRIPE_PRICE_ID = /^price_[A-Za-z0-9]{10,}$/;

export function isUsableStripePriceId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const id = value.trim();
  if (!USABLE_STRIPE_PRICE_ID.test(id)) return false;
  // Env examples use `price_...` — reject any ID that is mostly dots/underscores.
  const suffix = id.slice("price_".length);
  return /[A-Za-z0-9]/.test(suffix) && !/^\.+$/.test(suffix);
}

export function readStripePriceEnv(
  envSource: Record<string, unknown> | undefined,
  processEnv: NodeJS.ProcessEnv | undefined,
  name: string,
): string {
  const fromProcess = processEnv?.[name];
  const fromWasp = envSource?.[name];
  const candidates = [fromProcess, fromWasp].map((value) =>
    typeof value === "string" ? value.trim() : "",
  );
  return candidates.find(isUsableStripePriceId) ?? candidates.find(Boolean) ?? "";
}
