import {
  isTransactionalMessage,
  streamForMessage,
  topicForMessage,
  type EmailMessageId,
} from "../../shared/emailCatalog";
import type { ServerLocale } from "../i18n/serverLocale";
import { logger } from "../logger";
import { fromForStream, resolveEmailProviderName } from "./config";
import { resolveEmailDb } from "./db";
import { getEmailProvider } from "./factory";
import { listUnsubscribeHeaders, unsubscribeUrl } from "./headers";
import { hashEmail, normalizeEmail } from "./hash";
import { isEmailSuppressed, isTopicOptedOut } from "./suppression";
import { renderCatalogEmail } from "./templates";
import { createUnsubscribeToken, getLifecycleEmailSecret } from "../lifecycle/unsubscribeToken";

export type EnqueueEmailInput = {
  messageId: EmailMessageId;
  to: string;
  userId?: string;
  locale?: ServerLocale;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
  scheduledAt?: Date;
  context?: { entities?: any };
};

export type EnqueueResult = {
  id: string;
  status: string;
  skipped?: "suppressed" | "opted_out" | "duplicate";
};

export type DeliverOutboxOutcome =
  | "SENT"
  | "SUPPRESSED"
  | "FAILED"
  | "SKIPPED";

export type DeliverOutboxRowResult = {
  id: string;
  outcome: DeliverOutboxOutcome;
  error?: string;
};

export type DeliverOutboxRowOpts = {
  /** When true, deliver even if scheduledAt is in the future (ops flush by id). */
  ignoreScheduledAt?: boolean;
};

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveUserIdForEmail(
  db: ReturnType<typeof resolveEmailDb>,
  email: string,
  explicitUserId?: string,
): Promise<string | undefined> {
  if (explicitUserId) return explicitUserId;
  if (!db.user?.findFirst) return undefined;
  try {
    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    return user?.id || undefined;
  } catch {
    return undefined;
  }
}

function ensureUnsubscribePayload(
  userId: string | undefined,
  messageId: EmailMessageId,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (isTransactionalMessage(messageId)) return payload;
  if (payload.unsubscribeUrl) return payload;
  if (!userId) return payload;
  const secret = getLifecycleEmailSecret();
  if (!secret) return payload;
  return {
    ...payload,
    unsubscribeUrl: unsubscribeUrl(createUnsubscribeToken(userId, secret)),
  };
}

export async function enqueueEmail(
  input: EnqueueEmailInput,
): Promise<EnqueueResult> {
  const db = resolveEmailDb(input.context);
  const to = normalizeEmail(input.to);
  const locale = input.locale || "pt-BR";
  const userId = await resolveUserIdForEmail(db, to, input.userId);
  const payload = ensureUnsubscribePayload(
    userId,
    input.messageId,
    input.payload || {},
  );
  const rendered = renderCatalogEmail(input.messageId, locale, payload);
  const topic = topicForMessage(input.messageId);
  const stream = streamForMessage(input.messageId);

  if (await isEmailSuppressed(to, input.context)) {
    return { id: input.idempotencyKey, status: "SUPPRESSED", skipped: "suppressed" };
  }
  if (topic && (await isTopicOptedOut(to, topic, db))) {
    return { id: input.idempotencyKey, status: "SUPPRESSED", skipped: "opted_out" };
  }

  const existing = await db.emailMessage?.findUnique?.({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    return { id: existing.id, status: existing.status, skipped: "duplicate" };
  }

  const row = await db.emailMessage.create({
    data: {
      messageId: input.messageId,
      topic,
      stream,
      to,
      toHash: hashEmail(to),
      userId: userId ?? null,
      subject: rendered.subject,
      provider: resolveEmailProviderName(),
      status: "QUEUED",
      idempotencyKey: input.idempotencyKey,
      payload: { ...payload, locale },
      scheduledAt: input.scheduledAt || new Date(),
    },
  });

  if (!input.scheduledAt || input.scheduledAt.getTime() <= Date.now() + 250) {
    await deliverOutboxRow(row.id, input.context);
  }

  const latest = await db.emailMessage.findUnique({ where: { id: row.id } });
  return { id: row.id, status: latest?.status || "QUEUED" };
}

export async function enqueueEmailBatch(
  inputs: EnqueueEmailInput[],
): Promise<EnqueueResult[]> {
  const results: EnqueueResult[] = [];
  for (const input of inputs) {
    results.push(await enqueueEmail(input));
  }
  return results;
}

async function deliverOutboxRow(
  id: string,
  context?: { entities?: any },
  opts?: DeliverOutboxRowOpts,
): Promise<DeliverOutboxRowResult> {
  const db = resolveEmailDb(context);
  const row = await db.emailMessage.findUnique({ where: { id } });
  if (!row || row.status !== "QUEUED") {
    return { id, outcome: "SKIPPED" };
  }
  if (
    !opts?.ignoreScheduledAt &&
    row.scheduledAt &&
    new Date(row.scheduledAt) > new Date()
  ) {
    return { id, outcome: "SKIPPED" };
  }

  if (await isEmailSuppressed(row.to, context)) {
    await db.emailMessage.update({
      where: { id },
      data: { status: "SUPPRESSED", lastError: "suppressed" },
    });
    return { id, outcome: "SUPPRESSED", error: "suppressed" };
  }

  const messageId = row.messageId as EmailMessageId;
  const topic = topicForMessage(messageId);
  if (topic && (await isTopicOptedOut(row.to, topic, db))) {
    await db.emailMessage.update({
      where: { id },
      data: { status: "SUPPRESSED", lastError: "opted_out" },
    });
    return { id, outcome: "SUPPRESSED", error: "opted_out" };
  }

  await db.emailMessage.update({
    where: { id },
    data: { status: "SENDING", attempts: (row.attempts || 0) + 1 },
  });

  const payload = (row.payload || {}) as Record<string, unknown>;
  const locale = (payload.locale as ServerLocale) || "pt-BR";
  const rendered = renderCatalogEmail(messageId, locale, payload);
  const stream = streamForMessage(messageId);
  const headers = listUnsubscribeHeaders(
    String(payload.unsubscribeToken || ""),
    messageId,
  );

  let tokenHeaders = headers;
  if (row.userId && !isTransactionalMessage(messageId)) {
    const secret = getLifecycleEmailSecret();
    if (secret) {
      const token = createUnsubscribeToken(row.userId, secret);
      tokenHeaders = listUnsubscribeHeaders(token, messageId);
    }
  }

  const provider = getEmailProvider();
  const result = await provider.send({
    to: row.to,
    from: fromForStream(stream),
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    tags: { messageId, stream },
    headers: tokenHeaders,
    idempotencyKey: row.idempotencyKey,
  });

  if (!result.ok) {
    const error = result.error || "send_failed";
    logger.warn("[email] send failed", {
      id,
      messageId,
      error,
    });
    await db.emailMessage.update({
      where: { id },
      data: {
        status: (row.attempts || 0) + 1 >= 5 ? "FAILED" : "QUEUED",
        lastError: error,
      },
    });
    return { id, outcome: "FAILED", error };
  }

  await db.emailMessage.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      provider: provider.name,
      providerMessageId: result.providerMessageId,
      subject: rendered.subject,
      lastError: null,
    },
  });
  return { id, outcome: "SENT" };
}

/**
 * Deliver specific outbox rows by id, sequentially, through the normal
 * deliverOutboxRow path (suppression + opt-out + catalog render).
 * Temporarily ignores scheduledAt for these explicit ids only.
 * Never returns recipient emails.
 */
export async function deliverOutboxRowsByIds(
  ids: string[],
  opts: { pauseMs: number },
  context?: { entities?: any },
): Promise<DeliverOutboxRowResult[]> {
  const db = resolveEmailDb(context);
  const results: DeliverOutboxRowResult[] = [];
  const pauseMs = Math.max(0, opts.pauseMs || 0);

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const row = await db.emailMessage.findUnique({ where: { id } });
    if (!row || row.status !== "QUEUED") {
      results.push({ id, outcome: "SKIPPED" });
    } else {
      results.push(
        await deliverOutboxRow(id, context, { ignoreScheduledAt: true }),
      );
    }
    if (i < ids.length - 1 && pauseMs > 0) {
      await sleep(pauseMs);
    }
  }

  return results;
}

export async function processEmailOutbox(
  context?: { entities?: any },
  limit = 50,
): Promise<{ processed: number; sent: number }> {
  const db = resolveEmailDb(context);
  const due = await db.emailMessage.findMany({
    where: {
      status: "QUEUED",
      scheduledAt: { lte: new Date() },
    },
    take: limit,
  });
  let sent = 0;
  for (const row of due) {
    const result = await deliverOutboxRow(row.id, context);
    if (result.outcome === "SENT") sent++;
  }
  return { processed: due.length, sent };
}

export async function markOutboxByProviderId(
  providerMessageId: string,
  status: "DELIVERED" | "BOUNCED" | "FAILED",
  context?: { entities?: any },
): Promise<void> {
  const db = resolveEmailDb(context);
  const row = await db.emailMessage.findFirst({
    where: { providerMessageId },
    select: { id: true },
  });
  if (!row) return;
  await db.emailMessage.update({
    where: { id: row.id },
    data: { status },
  });
}
