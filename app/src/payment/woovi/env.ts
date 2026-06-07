import * as z from "zod";

export const wooviEnvSchema = z.object({
  WOOVI_APP_ID: z.string().default(''),
  WOOVI_WEBHOOK_SECRET: z.string().default(''),
  WOOVI_PIX_MODE: z
    .enum(["automatico", "simples"])
    .default("automatico"),
  WOOVI_SANDBOX: z
    .enum(["true", "false"])
    .default("false"),
  WOOVI_CATECHIST_PRO_PLAN_ID: z.string().default(''),
  WOOVI_PARISH_PLAN_ID: z.string().default(''),
  WOOVI_DIOCESE_PLAN_ID: z.string().default(''),
});
