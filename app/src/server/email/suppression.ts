import type { EmailTopicId } from "../../shared/emailCatalog";
import { resolveEmailDb, type EmailDb } from "./db";
import { hashEmail, normalizeEmail } from "./hash";

export async function isEmailSuppressed(
  email: string,
  context?: { entities?: any },
): Promise<boolean> {
  const db = resolveEmailDb(context);
  if (!db.emailSuppression) return false;
  const found = await db.emailSuppression.findFirst({
    where: { emailHash: hashEmail(email) },
    select: { id: true },
  });
  return Boolean(found);
}

export async function suppressEmail(args: {
  email: string;
  reason: "HARD_BOUNCE" | "COMPLAINT" | "UNSUBSCRIBE";
  source: string;
  context?: { entities?: any };
}): Promise<void> {
  const db = resolveEmailDb(args.context);
  if (!db.emailSuppression) return;
  const email = normalizeEmail(args.email);
  const emailHash = hashEmail(email);
  const existing = await db.emailSuppression.findFirst({
    where: { emailHash, reason: args.reason },
    select: { id: true },
  });
  if (existing) {
    await db.emailSuppression.update({
      where: { id: existing.id },
      data: { source: args.source },
    });
    return;
  }
  await db.emailSuppression.create({
    data: {
      email,
      emailHash,
      reason: args.reason,
      source: args.source,
    },
  });
}

export async function isTopicOptedOut(
  email: string,
  topic: EmailTopicId,
  db?: EmailDb,
): Promise<boolean> {
  const store = db || resolveEmailDb();
  if (!store.emailPreference) return false;
  const pref = await store.emailPreference.findFirst({
    where: {
      email: normalizeEmail(email),
      topic,
      optedOutAt: { not: null },
    },
    select: { id: true },
  });
  return Boolean(pref);
}
