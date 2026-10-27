/**
 * One-off ops seed: trial extension notice (Oct 2026).
 *
 * Env:
 *   TRIAL_EXT_USER_IDS  — comma-separated user ids (required, max 100)
 *   TRIAL_EXT_DRY_RUN   — "0" to send; default / any other value = dry-run
 *   TRIAL_EXT_PAUSE_MS  — pause between users in ms (default 15000)
 *
 * Prints aggregate JSON + per-row status only — never recipient emails or names.
 */
import type { PrismaClient } from "@prisma/client";
import { EMAIL_MESSAGE } from "../../shared/emailCatalog";
import { computeTrialClock } from "../lifecycle/selectCampaign";
import {
  formatTrialEndsAtSaoPaulo,
  resolveTrialExtensionCtaPath,
  selectTrialExtensionVariant,
  TRIAL_EXTENSION_CAMPAIGN,
} from "../lifecycle/trialExtensionNoticeCopy";
import {
  deliverOutboxRowsByIds,
  enqueueEmail,
} from "../email/service";

const MAX_USER_IDS = 100;
const DEFAULT_PAUSE_MS = 15000;

export type TrialExtSkipReason =
  | "not_found"
  | "no_email"
  | "admin"
  | "opt_out"
  | "already";

export type TrialExtRowStatus =
  | "sent"
  | "failed"
  | "dry_run"
  | "skipped_optout"
  | "skipped_already"
  | "skipped_other";

export type TrialExtCounts = {
  considered: number;
  sent: number;
  failed: number;
  skipped_optout: number;
  skipped_already: number;
  skipped_other: number;
  variantA: number;
  variantB: number;
};

function appBaseUrl(): string {
  return (process.env.WASP_WEB_CLIENT_URL || "https://catechis.app").replace(
    /\/$/,
    "",
  );
}

export function parseTrialExtUserIds(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

/** Default dry-run unless TRIAL_EXT_DRY_RUN=0. */
export function isTrialExtDryRun(raw: string | undefined): boolean {
  return raw !== "0";
}

export function parseTrialExtPauseMs(raw: string | undefined): number {
  const n = Number.parseInt(raw || String(DEFAULT_PAUSE_MS), 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_PAUSE_MS;
  return n;
}

export function classifyTrialExtensionSkip(user: {
  email?: string | null;
  isAdmin?: boolean;
  lifecycleEmailsOptOutAt?: Date | string | null;
  lifecycleEmailLogs?: { campaign: string }[];
} | null): TrialExtSkipReason | null {
  if (!user) return "not_found";
  if (!user.email) return "no_email";
  if (user.isAdmin) return "admin";
  if (user.lifecycleEmailsOptOutAt) return "opt_out";
  const already = (user.lifecycleEmailLogs || []).some(
    (log) => log.campaign === TRIAL_EXTENSION_CAMPAIGN,
  );
  if (already) return "already";
  return null;
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyCounts(): TrialExtCounts {
  return {
    considered: 0,
    sent: 0,
    failed: 0,
    skipped_optout: 0,
    skipped_already: 0,
    skipped_other: 0,
    variantA: 0,
    variantB: 0,
  };
}

function bumpSkip(counts: TrialExtCounts, reason: TrialExtSkipReason): TrialExtRowStatus {
  if (reason === "opt_out") {
    counts.skipped_optout++;
    return "skipped_optout";
  }
  if (reason === "already") {
    counts.skipped_already++;
    return "skipped_already";
  }
  counts.skipped_other++;
  return "skipped_other";
}

export async function sendTrialExtensionNotice(
  prismaClient: PrismaClient,
): Promise<TrialExtCounts> {
  const ids = parseTrialExtUserIds(process.env.TRIAL_EXT_USER_IDS);
  const dryRun = isTrialExtDryRun(process.env.TRIAL_EXT_DRY_RUN);
  const pauseMs = parseTrialExtPauseMs(process.env.TRIAL_EXT_PAUSE_MS);
  const counts = emptyCounts();

  if (ids.length === 0) {
    throw new Error("TRIAL_EXT_USER_IDS is required (comma-separated user ids)");
  }
  if (ids.length > MAX_USER_IDS) {
    throw new Error(
      `TRIAL_EXT_USER_IDS max ${MAX_USER_IDS} ids (got ${ids.length})`,
    );
  }

  const context = {
    entities: {
      EmailMessage: prismaClient.emailMessage,
      EmailSuppression: prismaClient.emailSuppression,
      EmailPreference: prismaClient.emailPreference,
      User: prismaClient.user,
      LifecycleEmailLog: prismaClient.lifecycleEmailLog,
      Membership: prismaClient.membership,
      CatechesisClass: prismaClient.catechesisClass,
    },
  };

  const baseUrl = appBaseUrl();
  const now = new Date();

  for (let i = 0; i < ids.length; i++) {
    const userId = ids[i];
    counts.considered++;

    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        createdAt: true,
        trialEndsAt: true,
        isAdmin: true,
        lifecycleEmailsOptOutAt: true,
        lifecycleEmailLogs: {
          where: { campaign: TRIAL_EXTENSION_CAMPAIGN },
          select: { campaign: true },
          take: 1,
        },
        memberships: {
          select: { parishId: true },
        },
      },
    });

    const skip = classifyTrialExtensionSkip(user);
    if (skip) {
      const status = bumpSkip(counts, skip);
      console.log(`userId=${userId} status=${status}`);
      continue;
    }

    const parishIds = [
      ...new Set(
        (user!.memberships || [])
          .map((m: { parishId: string }) => m.parishId)
          .filter(Boolean),
      ),
    ];

    const firstClass =
      parishIds.length > 0
        ? await prismaClient.catechesisClass.findFirst({
            where: {
              parishId: { in: parishIds },
              status: { not: "ARCHIVED" },
            },
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true },
          })
        : null;

    const variant = selectTrialExtensionVariant(Boolean(firstClass));
    if (variant === "A") counts.variantA++;
    else counts.variantB++;

    const endsAt = computeTrialClock(
      user!.createdAt,
      now,
      undefined,
      user!.trialEndsAt,
    ).endsAt;
    const data = formatTrialEndsAtSaoPaulo(endsAt);
    const ctaPath = resolveTrialExtensionCtaPath(variant, firstClass?.id);
    const ctaUrl = `${baseUrl}${ctaPath}`;

    if (dryRun) {
      console.log(`userId=${userId} status=dry_run variant=${variant}`);
      if (i < ids.length - 1 && pauseMs > 0) await sleep(pauseMs);
      continue;
    }

    let rowStatus: TrialExtRowStatus = "failed";
    try {
      const result = await enqueueEmail({
        messageId: EMAIL_MESSAGE.LIFECYCLE_TRIAL_EXTENSION_2026_10,
        to: user!.email!,
        userId: user!.id,
        locale: "pt-BR",
        payload: {
          variant,
          nome: user!.firstName || "",
          name: user!.firstName || "",
          data,
          trialEndsAt: data,
          turma: firstClass?.name || "",
          className: firstClass?.name || "",
          ctaUrl,
        },
        idempotencyKey: `lifecycle.${TRIAL_EXTENSION_CAMPAIGN}:${user!.id}`,
        // Stay QUEUED so deliverOutboxRowsByIds owns the send (like flush by id).
        scheduledAt: new Date(Date.now() + 60_000),
        context,
      });

      if (result.skipped === "suppressed" || result.skipped === "opted_out") {
        counts.skipped_optout++;
        rowStatus = "skipped_optout";
        console.log(`userId=${userId} status=${rowStatus} variant=${variant}`);
        if (i < ids.length - 1 && pauseMs > 0) await sleep(pauseMs);
        continue;
      }

      if (result.skipped === "duplicate") {
        counts.skipped_already++;
        rowStatus = "skipped_already";
        console.log(`userId=${userId} status=${rowStatus} variant=${variant}`);
        if (i < ids.length - 1 && pauseMs > 0) await sleep(pauseMs);
        continue;
      }

      const [deliver] = await deliverOutboxRowsByIds(
        [result.id],
        { pauseMs: 0 },
        context,
      );

      if (
        deliver?.outcome === "SUPPRESSED" ||
        deliver?.error === "opted_out" ||
        deliver?.error === "suppressed"
      ) {
        counts.skipped_optout++;
        rowStatus = "skipped_optout";
        console.log(`userId=${userId} status=${rowStatus} variant=${variant}`);
        if (i < ids.length - 1 && pauseMs > 0) await sleep(pauseMs);
        continue;
      }

      try {
        await prismaClient.lifecycleEmailLog.create({
          data: {
            userId: user!.id,
            campaign: TRIAL_EXTENSION_CAMPAIGN,
            sentAt: now,
          },
        });
      } catch {
        // Unique (userId, campaign) — treat as already handled.
        counts.skipped_already++;
        rowStatus = "skipped_already";
        console.log(`userId=${userId} status=${rowStatus} variant=${variant}`);
        if (i < ids.length - 1 && pauseMs > 0) await sleep(pauseMs);
        continue;
      }

      if (deliver?.outcome === "SENT") {
        counts.sent++;
        rowStatus = "sent";
      } else {
        counts.failed++;
        rowStatus = "failed";
      }
    } catch {
      counts.failed++;
      rowStatus = "failed";
    }

    console.log(`userId=${userId} status=${rowStatus} variant=${variant}`);
    if (i < ids.length - 1 && pauseMs > 0) await sleep(pauseMs);
  }

  console.log(JSON.stringify(counts));
  return counts;
}
