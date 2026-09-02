import * as z from "zod";

/** Optional leftover Open SaaS keys. Daily stats use first-party Postgres data. */
export const plausibleEnvSchema = z.object({
  PLAUSIBLE_API_KEY: z.string().optional().default(""),
  PLAUSIBLE_SITE_ID: z.string().optional().default(""),
  PLAUSIBLE_BASE_URL: z.string().optional().default("https://plausible.io/api"),
});

export const googleAnalyticsEnvSchema = z.object({
  GOOGLE_ANALYTICS_CLIENT_EMAIL: z.string().optional().default(""),
  GOOGLE_ANALYTICS_PRIVATE_KEY: z.string().optional().default(""),
  GOOGLE_ANALYTICS_PROPERTY_ID: z.string().optional().default(""),
});
