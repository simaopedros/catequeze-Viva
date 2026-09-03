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

function ensureUnsubscribePayload(
  input: EnqueueEmailInput,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (isTransactionalMessage(input.messageId)) return payload;
  if (payload.unsubscribeUrl) return payload;
  if (!input.userId) return payload;
  const secret = getLifecycleEmailSecret();
  if (!secret) return payload;
  return {
    ...payload,
    unsubscribeUrl: unsubscribeUrl(createUnsubscribeToken(input.userId, secret)),
  };
}

export async function enqueueEmail(
  input: EnqueueEmailInput,
): Promise<EnqueueResult> {
  const db = resolveEmailDb(input.context);
  const to = normalizeEmail(input.to);
  const locale = input.locale || "pt-BR";
  const payload = ensureUnsubscribePayload(input, input.payload || {});
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
      userId: input.userId ?? null,
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
): Promise<boolean> {
  const db = resolveEmailDb(context);
  const row = await db.emailMessage.findUnique({ where: { id } });
  if (!row || row.status !== "QUEUED") return false;
  if (row.scheduledAt && new Date(row.scheduledAt) > new Date()) return false;

  if (await isEmailSuppressed(row.to, context)) {
    await db.emailMessage.update({
      where: { id },
      data: { status: "SUPPRESSED", lastError: "suppressed" },
    });
    return false;
  }

  const messageId = row.messageId as EmailMessageId;
  const topic = topicForMessage(messageId);
  if (topic && (await isTopicOptedOut(row.to, topic, db))) {
    await db.emailMessage.update({
      where: { id },
      data: { status: "SUPPRESSED", lastError: "opted_out" },
    });
    return false;
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
    logger.warn("[email] send failed", {
      id,
      messageId,
      error: result.error,
    });
    await db.emailMessage.update({
      where: { id },
      data: {
        status: (row.attempts || 0) + 1 >= 5 ? "FAILED" : "QUEUED",
        lastError: result.error || "send_failed",
      },
    });
    return false;
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
  return true;
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
    const ok = await deliverOutboxRow(row.id, context);
    if (ok) sent++;
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
