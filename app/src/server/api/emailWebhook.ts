import express from "express";
import type { MiddlewareConfigFn } from "wasp/server";
import { EmailWebhookUnavailableError } from "../email/port";
import type { Request, Response } from "express";
import { EMAIL_TOPIC } from "../../shared/emailCatalog";
import { logger } from "../logger";
import { getEmailProvider } from "../email/factory";
import { markOutboxByProviderId } from "../email/service";
import { setEmailPreference } from "../email/preferences";
import { suppressEmail } from "../email/suppression";

export const emailWebhookMiddlewareConfigFn: MiddlewareConfigFn = (config) => {
  config.delete("express.json");
  config.set("express.raw", express.raw({ type: "application/json" }));
  return config;
};

export async function emailWebhookHandler(
  req: Request,
  res: Response,
  context: { entities?: any },
) {
  res.setHeader("Cache-Control", "no-store");
  const raw = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body ?? {});

  try {
    const provider = getEmailProvider();
    if (provider.name !== "resend") throw new EmailWebhookUnavailableError();
    const events = await provider.verifyWebhook(raw, req.headers);
    for (const event of events) {
      if (event.type === "email.delivered" && event.providerMessageId) {
        await markOutboxByProviderId(event.providerMessageId, "DELIVERED", context);
      }
      if (event.type === "email.bounced") {
        if (event.providerMessageId) {
          await markOutboxByProviderId(event.providerMessageId, "BOUNCED", context);
        }
        if (event.email) {
          await suppressEmail({
            email: event.email,
            reason: "HARD_BOUNCE",
            source: "webhook",
            context,
          });
        }
      }
      if (event.type === "email.complained") {
        if (event.email) {
          await suppressEmail({
            email: event.email,
            reason: "COMPLAINT",
            source: "webhook",
            context,
          });
          await setEmailPreference({
            email: event.email,
            topic: EMAIL_TOPIC.PRODUCT_UPDATES,
            optedIn: false,
            context,
          });
        }
      }
    }
    res.status(200).json({ ok: true, count: events.length });
  } catch (error) {
    logger.warn("[email] webhook rejected", {
      error: error instanceof Error ? error.message : String(error),
    });
    res
      .status(error instanceof EmailWebhookUnavailableError ? 503 : 400)
      .json({ ok: false });
  }
}
