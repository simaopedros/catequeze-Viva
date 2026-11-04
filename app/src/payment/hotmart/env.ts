import * as z from "zod";

const optionalText = z.string().optional().default("");

/**
 * Hotmart stays off until HOTMART_PRIMARY_CHECKOUT=true.
 * HOTMART_HOTTOK is a secret: never log it and never return it to the client.
 */
export const hotmartEnvSchema = z.object({
  HOTMART_PRIMARY_CHECKOUT: z.string().optional().default("false"),
  HOTMART_HOTTOK: optionalText,
  HOTMART_PRODUCT_UCODES: optionalText,
  HOTMART_OVERDUE_GRACE_DAYS: z.string().optional().default("3"),
  HOTMART_CHECKOUT_URL_SINGLE_MONTHLY: optionalText,
  HOTMART_CHECKOUT_URL_SINGLE_ANNUAL: optionalText,
  HOTMART_CHECKOUT_URL_UNLIMITED_MONTHLY: optionalText,
  HOTMART_CHECKOUT_URL_UNLIMITED_ANNUAL: optionalText,
  HOTMART_CHECKOUT_URL_DIOCESE_MONTHLY: optionalText,
  HOTMART_CHECKOUT_URL_DIOCESE_ANNUAL: optionalText,
  HOTMART_OFFER_SINGLE_MONTHLY: optionalText,
  HOTMART_OFFER_SINGLE_ANNUAL: optionalText,
  HOTMART_OFFER_UNLIMITED_MONTHLY: optionalText,
  HOTMART_OFFER_UNLIMITED_ANNUAL: optionalText,
  HOTMART_OFFER_DIOCESE_MONTHLY: optionalText,
  HOTMART_OFFER_DIOCESE_ANNUAL: optionalText,
  HOTMART_PLAN_ID_SINGLE_MONTHLY: optionalText,
  HOTMART_PLAN_ID_SINGLE_ANNUAL: optionalText,
  HOTMART_PLAN_ID_UNLIMITED_MONTHLY: optionalText,
  HOTMART_PLAN_ID_UNLIMITED_ANNUAL: optionalText,
  HOTMART_PLAN_ID_DIOCESE_MONTHLY: optionalText,
  HOTMART_PLAN_ID_DIOCESE_ANNUAL: optionalText,
});
