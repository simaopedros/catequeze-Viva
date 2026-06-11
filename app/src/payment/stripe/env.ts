import * as z from "zod";
import { paymentPlansSchema } from "../env";

export const stripeEnvSchema = paymentPlansSchema.extend({
  STRIPE_API_KEY: z.string({ error: "STRIPE_API_KEY is required" }),
  STRIPE_WEBHOOK_SECRET: z.string({
    error: "STRIPE_WEBHOOK_SECRET is required",
  }),
  STRIPE_CATECHIST_PRO_PLAN_ID: z.string().default(''),
  STRIPE_CATECHIST_AI_PLAN_ID: z.string().default(''),
  STRIPE_PARISH_PLAN_ID: z.string().default(''),
  STRIPE_PARISH_ESSENTIAL_PLAN_ID: z.string().default(''),
  STRIPE_PARISH_COMPLETE_PLAN_ID: z.string().default(''),
  STRIPE_DIOCESE_PLAN_ID: z.string().default(''),
  STRIPE_AI_CREDITS_20_PLAN_ID: z.string().default(''),
  STRIPE_AI_CREDITS_50_PLAN_ID: z.string().default(''),
  // Annual billing
  STRIPE_CATECHIST_PRO_ANNUAL_PLAN_ID: z.string().default(''),
  STRIPE_CATECHIST_AI_ANNUAL_PLAN_ID: z.string().default(''),
  STRIPE_PARISH_ANNUAL_PLAN_ID: z.string().default(''),
  STRIPE_PARISH_ESSENTIAL_ANNUAL_PLAN_ID: z.string().default(''),
  STRIPE_PARISH_COMPLETE_ANNUAL_PLAN_ID: z.string().default(''),
  STRIPE_DIOCESE_ANNUAL_PLAN_ID: z.string().default(''),
  ENABLE_PRICING_V2: z.string().optional(),
  PRICING_ROLLOUT_PERCENTAGE: z.string().optional(),
});
