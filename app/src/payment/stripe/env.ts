import * as z from "zod";

/**
 * Stripe env vars — Brazil-only (BRL).
 *
 * All Price IDs must be created in the Stripe Dashboard with currency BRL:
 *   - Plano Único (single): monthly + annual
 *   - Plano Ilimitado (unlimited): monthly + annual
 *   - AI credit packs: +20, +50 (one-time)
 */
export const stripeEnvSchema = z.object({
  STRIPE_API_KEY: z.string({ error: "STRIPE_API_KEY is required" }),
  STRIPE_WEBHOOK_SECRET: z.string({
    error: "STRIPE_WEBHOOK_SECRET is required",
  }),
  // Plano Único
  STRIPE_SINGLE_PLAN_ID: z.string().default(''),
  STRIPE_SINGLE_ANNUAL_PLAN_ID: z.string().default(''),
  // Plano Ilimitado
  STRIPE_UNLIMITED_PLAN_ID: z.string().default(''),
  STRIPE_UNLIMITED_ANNUAL_PLAN_ID: z.string().default(''),
  // AI credit packs (one-time)
  STRIPE_AI_CREDITS_20_PLAN_ID: z.string().default(''),
  STRIPE_AI_CREDITS_50_PLAN_ID: z.string().default(''),
  // db (default) = PricingPlan tables (admin catalog)
  // static = hardcoded DEFAULT_PLANS + env Price IDs (rollback)
  PRICING_CATALOG_SOURCE: z.enum(['static', 'db']).optional().default('db'),
});
