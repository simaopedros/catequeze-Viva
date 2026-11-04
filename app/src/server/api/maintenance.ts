import type { Request, Response } from "express";
import { calculateDailyStats } from "../../analytics/stats";
import { logger } from "../logger";
import { recordJobRun } from "../jobs/recordJobRun";
import { cleanupAiCacheJob } from "../scripts/aiCacheCleanupJob";
import { resetAiCreditsJob } from "../scripts/aiCreditsResetJob";
import { sendRegistrationRemindersJob } from "../scripts/registrationRemindersJob";
import { sendRemindersJob } from "../scripts/remindersJob";
import { reconcileSocialMediaJob } from "../scripts/socialMediaReconcileJob";
import { lifecycleNudgeJob } from "../scripts/lifecycleNudgeJob";
import { processEmailOutbox } from "../email/service";
import { maintenanceSecretMatches } from "./maintenanceAuth";

export { maintenanceSecretMatches } from "./maintenanceAuth";

type MaintenanceTask = {
  name: string;
  run: () => Promise<unknown>;
};

let maintenanceRunning = false;

function headerValue(req: Request): string {
  const value = req.headers["x-maintenance-secret"];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

/**
 * Runs all periodic database work once, without keeping a PostgreSQL-backed
 * queue alive between executions. Invoke daily from the VPS cron.
 * Does not expire trials — see `/api/internal/subscription-expiration`.
 */
export async function maintenanceHandler(
  req: Request,
  res: Response,
  context: any,
) {
  res.setHeader("Cache-Control", "no-store");

  const expectedSecret = process.env.MAINTENANCE_SECRET;
  if (!expectedSecret) {
    logger.error("[maintenance] MAINTENANCE_SECRET is not configured");
    res.status(503).json({ status: "unconfigured" });
    return;
  }

  if (!maintenanceSecretMatches(headerValue(req), expectedSecret)) {
    res.status(401).json({ status: "unauthorized" });
    return;
  }

  if (maintenanceRunning) {
    res.status(409).json({ status: "already-running" });
    return;
  }

  maintenanceRunning = true;
  const startedAt = Date.now();

  // Independent tasks run concurrently; the second stage depends on the first
  // (lifecycle emails / daily stats). Trial expiration lives on its own route.
  const stages: MaintenanceTask[][] = [
    [
      {
        name: "aiCreditsReset",
        run: () => resetAiCreditsJob(undefined, context),
      },
      {
        name: "aiCacheCleanup",
        run: () => cleanupAiCacheJob(undefined, context),
      },
      {
        name: "registrationReminders",
        run: () => sendRegistrationRemindersJob(undefined, context),
      },
      {
        name: "meetingReminders",
        run: () => sendRemindersJob(undefined, context),
      },
      {
        name: "socialMediaReconcile",
        run: () => reconcileSocialMediaJob(undefined, context),
      },
    ],
    [
      {
        name: "lifecycleNudge",
        run: () => lifecycleNudgeJob(undefined, context),
      },
      {
        name: "emailOutbox",
        run: () => processEmailOutbox(context, 100),
      },
      { name: "dailyStats", run: () => calculateDailyStats(undefined, context) },
    ],
  ];

  const results: Array<{
    name: string;
    status: "ok" | "error";
    durationMs: number;
    result?: unknown;
    error?: string;
  }> = [];

  const runTask = async (task: MaintenanceTask) => {
    const taskStartedAt = Date.now();
    try {
      // Persist start/finish/ok/error so /admin/sistema can show last run status.
      const result = await recordJobRun(context, task.name, task.run);
      results.push({
        name: task.name,
        status: "ok",
        durationMs: Date.now() - taskStartedAt,
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("[maintenance] Task failed", {
        task: task.name,
        error: message,
      });
      results.push({
        name: task.name,
        status: "error",
        durationMs: Date.now() - taskStartedAt,
        error: message,
      });
    }
  };

  try {
    for (const stage of stages) {
      await Promise.all(stage.map(runTask));
    }

    const failed = results.some((result) => result.status === "error");
    const payload = {
      status: failed ? "failed" : "ok",
      durationMs: Date.now() - startedAt,
      results,
    };
    logger.info("[maintenance] Run completed", {
      status: payload.status,
      durationMs: payload.durationMs,
    });
    res.status(failed ? 500 : 200).json(payload);
  } finally {
    maintenanceRunning = false;
  }
}
