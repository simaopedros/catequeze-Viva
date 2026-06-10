/** Cloudflare Access Service Token headers for homolog smoke tests (CI / scripted QA). */
export function getCfAccessHeaders(): Record<string, string> {
  const id = process.env.CF_ACCESS_CLIENT_ID?.trim();
  const secret = process.env.CF_ACCESS_CLIENT_SECRET?.trim();
  if (!id || !secret) return {};
  return {
    'CF-Access-Client-Id': id,
    'CF-Access-Client-Secret': secret,
  };
}

export function hasCfAccessCredentials(): boolean {
  return Object.keys(getCfAccessHeaders()).length === 2;
}
