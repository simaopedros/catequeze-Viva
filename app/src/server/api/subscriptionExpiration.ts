import type { Request, Response } from "express";
import { logger } from "../logger";
import { expireSubscriptionsJob } from "../scripts/subscriptionExpirationJob";
import { maintenanceSecretMatches } from "./maintenanceAuth";

const CONFIRM_VALUE = "expire-trials";

let subscriptionExpirationRunning = false;

function headerValue(req: Request): string {
  const value = req.headers["x-maintenance-secret"];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function confirmFlag(req: Request): string {
  const fromBody =
    req.body && typeof req.body.confirm === "string" ? req.body.confirm : "";
  const queryConfirm = req.query?.confirm;
  const fromQuery =
    typeof queryConfirm === "string"
      ? queryConfirm
      : Array.isArray(queryConfirm) && typeof queryConfirm[0] === "string"
        ? queryConfirm[0]
        : "";
  return fromBody || fromQuery;
}

/**
 * Explicit trial/subscription expiration. Kept off the daily maintenance route
 * so lifecycle email sends never trigger expiration. Requires confirm=expire-trials.
 * See docs/MAINTENANCE_JOBS.md — no scheduler is enabled by this endpoint alone.
 */
export async function subscriptionExpirationHandler(
  req: Request,
  res: Response,
  context: any,
) {
  res.setHeader("Cache-Control", "no-store");

  const expectedSecret = process.env.MAINTENANCE_SECRET;
  if (!expectedSecret) {
    logger.error(
      "[subscription-expiration] MAINTENANCE_SECRET is not configured",
    );
    res.status(503).json({ status: "unconfigured" });
    return;
  }

  if (!maintenanceSecretMatches(headerValue(req), expectedSecret)) {
    res.status(401).json({ status: "unauthorized" });
    return;
  }

  if (confirmFlag(req) !== CONFIRM_VALUE) {
    res.status(400).json({
      status: "confirm-required",
      message: `Pass confirm=${CONFIRM_VALUE} in the body or query string`,
    });
    return;
  }

  if (subscriptionExpirationRunning) {
    res.status(409).json({ status: "already-running" });
    return;
  }

  subscriptionExpirationRunning = true;
  const startedAt = Date.now();

  try {
    const result = await expireSubscriptionsJob(undefined, context);
    const payload = {
      status: "ok" as const,
      durationMs: Date.now() - startedAt,
      result,
    };
    logger.info("[subscription-expiration] Run completed", {
      durationMs: payload.durationMs,
      result,
    });
    res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[subscription-expiration] Run failed", { error: message });
    res.status(500).json({
      status: "failed",
      durationMs: Date.now() - startedAt,
      error: message,
    });
  } finally {
    subscriptionExpirationRunning = false;
  }
}
