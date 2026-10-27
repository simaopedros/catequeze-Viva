/**
 * One-off ops seed: deliver ONLY explicit EmailMessage outbox rows by id.
 *
 * Env:
 *   EMAIL_OUTBOX_IDS       — comma-separated EmailMessage ids (required)
 *   EMAIL_OUTBOX_PAUSE_MS  — pause between sends in ms (default 20000)
 *
 * Does NOT call processEmailOutbox, maintenance, lifecycle, or trial jobs.
 * Logs only id, messageId type and outcome — never recipient emails or secrets.
 */
import type { PrismaClient } from "@prisma/client";
import { deliverOutboxRowsByIds } from "../email/service";

function parseIds(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parsePauseMs(raw: string | undefined): number {
  const n = Number.parseInt(raw || "20000", 10);
  if (!Number.isFinite(n) || n < 0) return 20000;
  return n;
}

export async function flushEmailOutboxByIds(
  prismaClient: PrismaClient,
): Promise<void> {
  const ids = parseIds(process.env.EMAIL_OUTBOX_IDS);
  const pauseMs = parsePauseMs(process.env.EMAIL_OUTBOX_PAUSE_MS);

  if (ids.length === 0) {
    console.log(
      "[flushEmailOutboxByIds] EMAIL_OUTBOX_IDS empty — nothing to do",
    );
    return;
  }

  console.log(
    `[flushEmailOutboxByIds] starting count=${ids.length} pauseMs=${pauseMs}`,
  );

  const context = {
    entities: {
      EmailMessage: prismaClient.emailMessage,
      EmailSuppression: prismaClient.emailSuppression,
      EmailPreference: prismaClient.emailPreference,
      User: prismaClient.user,
    },
  };

  const results = await deliverOutboxRowsByIds(ids, { pauseMs }, context);

  for (const result of results) {
    const row = await prismaClient.emailMessage.findUnique({
      where: { id: result.id },
      select: { messageId: true },
    });
    console.log(
      `[flushEmailOutboxByIds] id=${result.id} messageId=${row?.messageId ?? "unknown"} outcome=${result.outcome}${
        result.error ? ` error=${result.error}` : ""
      }`,
    );
  }

  const summary = results.reduce(
    (acc, r) => {
      acc[r.outcome] = (acc[r.outcome] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log(
    `[flushEmailOutboxByIds] done summary=${JSON.stringify(summary)}`,
  );
}
