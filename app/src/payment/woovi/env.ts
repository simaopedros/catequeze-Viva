import * as z from "zod";

export const wooviEnvSchema = z.object({
  WOOVI_APP_ID: z.string({ error: "WOOVI_APP_ID is required" }),
  WOOVI_WEBHOOK_SECRET: z.string({
    error: "WOOVI_WEBHOOK_SECRET is required",
  }),
  WOOVI_PIX_MODE: z
    .enum(["automatico", "simples"])
    .default("automatico"),
  WOOVI_SANDBOX: z
    .enum(["true", "false"])
    .default("false"),
  WOOVI_CATECHIST_PRO_PLAN_ID: z.string({
    error: "WOOVI_CATECHIST_PRO_PLAN_ID is required (used as correlationID suffix or price reference)",
  }),
  WOOVI_PARISH_PLAN_ID: z.string({
    error: "WOOVI_PARISH_PLAN_ID is required",
  }),
  WOOVI_DIOCESE_PLAN_ID: z.string({
    error: "WOOVI_DIOCESE_PLAN_ID is required",
  }),
});
