import { PrismaClient } from "@prisma/client";
import { User } from "wasp/entities";
import type { MiddlewareConfigFn } from "wasp/server";
import type { PaymentsWebhook } from "wasp/server/api";
import type { PaymentPlan } from "./plans";
import { stripePaymentProcessor } from "./stripe/paymentProcessor";

export interface CreateCheckoutSessionTrackingArgs {
  priceId?: string;
  planId?: string;
  planName?: string;
  value?: number;
  currency?: string;
  trialDays?: number;
  initiateCheckoutEventId?: string;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  clientUserAgent?: string;
  eventSourceUrl?: string;
  landingPageUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export interface CreateCheckoutSessionArgs {
  userId: User["id"];
  userEmail: NonNullable<User["email"]>;
  paymentPlan: PaymentPlan;
  interval?: 'monthly' | 'annual';
  priceId?: string;
  prismaUserDelegate: PrismaClient["user"];
  tracking?: CreateCheckoutSessionTrackingArgs;
  trialPeriodDays?: number;
}

export interface FetchCustomerPortalUrlArgs {
  userId: User["id"];
  prismaUserDelegate: PrismaClient["user"];
}

export interface PaymentProcessor {
  id: "stripe";
  createCheckoutSession: (
    args: CreateCheckoutSessionArgs,
  ) => Promise<{ session: { id: string; url: string } }>;
  fetchCustomerPortalUrl: (
    args: FetchCustomerPortalUrlArgs,
  ) => Promise<string | null>;
  webhook: PaymentsWebhook;
  webhookMiddlewareConfigFn: MiddlewareConfigFn;
  fetchTotalRevenue: () => Promise<number>;
}

/**
 * Stripe is the sole payment processor. Billing is Brazil-only (BRL).
 */
export const paymentProcessor: PaymentProcessor = stripePaymentProcessor;
