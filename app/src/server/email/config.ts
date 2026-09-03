import {
  EMAIL_STREAM,
  type EmailStream,
} from "../../shared/emailCatalog";

export const EMAIL_BRAND_NAME = "Catequese Viva";

/** All product mail uses catechis.app — never a second root domain. */
const DEFAULT_FROM: Record<EmailStream, string> = {
  transactional: "noreply@catechis.app",
  lifecycle: "updates@catechis.app",
  pastoral: "comunicados@catechis.app",
  marketing: "hello@catechis.app",
};

export type EmailFrom = {
  name: string;
  email: string;
};

function envOr(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

export function emailBrandName(): string {
  return envOr("EMAIL_FROM_NAME", EMAIL_BRAND_NAME);
}

export function fromForStream(stream: EmailStream): EmailFrom {
  const envKey =
    stream === EMAIL_STREAM.TRANSACTIONAL
      ? "EMAIL_FROM_TRANSACTIONAL"
      : stream === EMAIL_STREAM.LIFECYCLE
        ? "EMAIL_FROM_LIFECYCLE"
        : stream === EMAIL_STREAM.PASTORAL
          ? "EMAIL_FROM_PASTORAL"
          : "EMAIL_FROM_MARKETING";
  return {
    name: emailBrandName(),
    email: envOr(envKey, DEFAULT_FROM[stream]),
  };
}

export function formatFrom(from: EmailFrom): string {
  return `${from.name} <${from.email}>`;
}

export function appBaseUrl(): string {
  return (process.env.WASP_WEB_CLIENT_URL || "https://catechis.app").replace(
    /\/$/,
    "",
  );
}

export function serverBaseUrl(): string {
  return (process.env.WASP_SERVER_URL || "https://api.catechis.app").replace(
    /\/$/,
    "",
  );
}

export function resolveEmailProviderName(): "resend" | "fake" {
  const explicit = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (explicit === "fake" || explicit === "resend") return explicit;
  if (process.env.VITEST || process.env.NODE_ENV === "test") return "fake";
  if (process.env.RESEND_API_KEY) return "resend";
  return "fake";
}

export function isTestEmailRuntime(): boolean {
  return Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";
}
