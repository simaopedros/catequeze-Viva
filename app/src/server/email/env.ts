import * as z from "zod";

export const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["resend", "fake"]).optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_FROM_TRANSACTIONAL: z.string().optional(),
  EMAIL_FROM_LIFECYCLE: z.string().optional(),
  EMAIL_FROM_PASTORAL: z.string().optional(),
  EMAIL_FROM_MARKETING: z.string().optional(),
  EMAIL_DEFAULT_LOCALE: z.enum(["pt-BR", "en", "es"]).optional(),
});
