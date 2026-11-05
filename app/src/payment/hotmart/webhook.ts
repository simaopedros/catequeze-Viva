import type { Request, Response } from "express";
import {
  activationUpdate,
  grantPlanAccess,
  isHotmartSubscriber,
  protectedBillingReason,
  type BillingAccount,
} from "./applyEntitlement";
import { isValidBuyerEmail, normalizeBuyerEmail } from "./buyerAccount";
import {
  headerHottok,
  hottokMatches,
  parseHotmartPostback,
  productIsAllowed,
  readHotmartEnv,
  sanitizeHotmartPayload,
  type HotmartPlanSlug,
  type ParsedPostback,
} from "./postback";
import {
  BuyerAlreadyExists,
  confirmBuyerEmail,
  createVerifiedBuyer,
  readEmailIdentity,
} from "./provisionBuyer";
import {
  sendHotmartAccessEmailSafe,
  sendHotmartPlanActiveEmailSafe,
} from "./welcomeEmail";

type EventStatus = "PROCESSED" | "IGNORED" | "FAILED";

function readBody(req: Request): unknown {
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body;
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as { code?: string }).code === "P2002",
  );
}

async function findAccount(
  users: any,
  parsed: ParsedPostback,
): Promise<BillingAccount | null> {
  if (!users?.findFirst && !users?.findUnique) return null;
  if (parsed.subscriberCode && users.findFirst) {
    const byCode = await users.findFirst({
      where: { hotmartSubscriberCode: parsed.subscriberCode },
    });
    if (byCode) return byCode;
  }
  if (!parsed.email || !users.findFirst) return null;
  return users.findFirst({
    where: { email: { equals: parsed.email, mode: "insensitive" } },
  });
}

async function savePending(
  pending: any,
  parsed: ParsedPostback,
  planSlug: HotmartPlanSlug,
  interval: string,
  accessEndsAt: Date | null,
) {
  if (!pending?.create || !parsed.email) return;
  const data = {
    email: parsed.email,
    planSlug,
    interval,
    accessEndsAt,
    hotmartSubscriberCode: parsed.subscriberCode,
    transaction: parsed.transaction,
    appliedAt: null,
    voidedAt: null,
  };
  if (parsed.transaction && pending.findUnique) {
    const existing = await pending.findUnique({
      where: { transaction: parsed.transaction },
    });
    if (existing && pending.update) {
      await pending.update({ where: { id: existing.id }, data });
      return;
    }
  }
  await pending.create({ data });
}

async function voidPending(pending: any, transaction: string | null) {
  if (!transaction || !pending?.updateMany) return;
  const now = new Date();
  await pending.updateMany({
    where: { transaction, appliedAt: null },
    data: { appliedAt: now, voidedAt: now },
  });
}

async function storeEvent(
  events: any,
  parsed: ParsedPostback,
  body: unknown,
  outcome: {
    status: EventStatus;
    error?: string | null;
    userId?: string | null;
  },
) {
  await events.create({
    data: {
      eventId: parsed.id,
      event: parsed.event,
      status: outcome.status,
      processedAt: new Date(),
      userId: outcome.userId ?? null,
      transaction: parsed.transaction,
      error: outcome.error ?? null,
      payload: sanitizeHotmartPayload(body),
    },
  });
}

async function applyApprovedPurchase(
  parsed: ParsedPostback,
  effect: Extract<ParsedPostback["effect"], { kind: "activate" }>,
  context: any,
  existing: BillingAccount | null,
): Promise<{ status: EventStatus; error?: string; userId?: string }> {
  const users = context.entities.User;
  let user = existing;
  if (!user) {
    const email = normalizeBuyerEmail(parsed.email);
    if (!email) return { status: "FAILED", error: "missing_buyer" };
    if (!isValidBuyerEmail(email)) {
      console.info(`[hotmart] invalid_buyer_email id=${parsed.id}`);
      return { status: "FAILED", error: "invalid_email" };
    }
    try {
      await createVerifiedBuyer({ email, buyerName: parsed.buyerName });
    } catch (error) {
      if (!(error instanceof BuyerAlreadyExists)) throw error;
    }
    user = await findAccount(users, { ...parsed, email });
    if (!user) throw new BuyerAlreadyExists();
  }

  const email = normalizeBuyerEmail(user.email || parsed.email);
  const wasVerified = Boolean(user.emailVerifiedAt);
  const identity = email ? await readEmailIdentity(email) : null;
  // No password yet: new account, unconfirmed signup that never finished, or an
  // email identity whose hash was never set. A confirmed account with no email
  // identity (for example Google) keeps the login link.
  const needsSetPassword =
    !identity?.hasPassword && (!wasVerified || Boolean(identity));
  if (email && !wasVerified) {
    await confirmBuyerEmail(email);
    await users.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  } else if (email && needsSetPassword) {
    await confirmBuyerEmail(email);
  }

  const offer = effect.offer;
  await grantPlanAccess(
    users,
    user.id,
    activationUpdate({
      planSlug: offer.planSlug,
      subscriberCode: parsed.subscriberCode || user.hotmartSubscriberCode,
      accessEndsAt: effect.accessEndsAt,
      paidAt: effect.paidAt,
    }),
    context,
    offer.planSlug,
  );

  if (email && isValidBuyerEmail(email)) {
    try {
      const notice = {
        email,
        transaction: parsed.transaction,
        eventId: parsed.id,
        userId: user.id,
        planSlug: offer.planSlug,
        context,
      };
      if (needsSetPassword) await sendHotmartAccessEmailSafe(notice);
      else await sendHotmartPlanActiveEmailSafe(notice);
    } catch (error) {
      console.warn(
        `[hotmart] purchase_email_failed id=${parsed.id} reason=${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
    }
  }

  return { status: "PROCESSED", userId: user.id };
}

function productBlocked(parsed: ParsedPostback, allowlist: string[]): boolean {
  if (parsed.event.startsWith("PURCHASE_")) {
    return !productIsAllowed(parsed.productUcode, allowlist);
  }
  if (
    parsed.productUcode &&
    allowlist.length > 0 &&
    !allowlist.includes(parsed.productUcode)
  ) {
    return true;
  }
  return false;
}

async function applyParsed(
  parsed: ParsedPostback,
  context: any,
): Promise<{ status: EventStatus; error?: string; userId?: string }> {
  const effect = parsed.effect;
  if (effect.kind === "ignore")
    return { status: "IGNORED", error: effect.reason };
  if (effect.kind === "fail") return { status: "FAILED", error: effect.reason };
  if (effect.kind === "record") return { status: "PROCESSED" };

  const users = context.entities.User;
  const pending = context.entities.PendingEntitlement;
  const user = await findAccount(users, parsed);
  const guard = protectedBillingReason(user);
  if (user && guard) {
    const error =
      guard === "manual" ? "manual_account" : "active_stripe_subscription";
    console.info(`[hotmart] skip_protected id=${parsed.id} reason=${error}`);
    return { status: "IGNORED", error, userId: user.id };
  }

  if (effect.kind === "activate") {
    return applyApprovedPurchase(parsed, effect, context, user);
  }

  if (effect.kind === "switch_plan") {
    const offer = effect.offer;
    const accessEndsAt = effect.accessEndsAt;
    if (!user) {
      if (!parsed.email) return { status: "FAILED", error: "missing_buyer" };
      await savePending(
        pending,
        parsed,
        offer.planSlug,
        offer.interval,
        accessEndsAt,
      );
      return { status: "PROCESSED", error: "pending_account" };
    }
    const linked = Boolean(
      parsed.subscriberCode &&
        user.hotmartSubscriberCode === parsed.subscriberCode,
    );
    if (!linked && !user.emailVerifiedAt) {
      await savePending(
        pending,
        parsed,
        offer.planSlug,
        offer.interval,
        accessEndsAt,
      );
      return {
        status: "PROCESSED",
        error: "pending_verification",
        userId: user.id,
      };
    }
    await grantPlanAccess(
      users,
      user.id,
      activationUpdate({
        planSlug: offer.planSlug,
        subscriberCode: parsed.subscriberCode || user.hotmartSubscriberCode,
        accessEndsAt,
        keepStatus: true,
      }),
      context,
      offer.planSlug,
    );
    if (
      offer.planSlug !== "unlimited" &&
      user.subscriptionPlan === "unlimited"
    ) {
      const { cascadeCancelToTenantBilling } = await import(
        "../billingCascade"
      );
      await cascadeCancelToTenantBilling(context, user.id);
    }
    return { status: "PROCESSED", userId: user.id };
  }

  if (!user || !isHotmartSubscriber(user)) {
    if (effect.kind === "revoke")
      await voidPending(pending, parsed.transaction);
    return {
      status: "IGNORED",
      error: user ? "not_hotmart_subscriber" : "user_not_found",
      userId: user?.id,
    };
  }

  if (effect.kind === "past_due") {
    await users.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "past_due",
        ...(effect.accessEndsAt ? { accessEndsAt: effect.accessEndsAt } : {}),
      },
    });
    return { status: "PROCESSED", userId: user.id };
  }

  if (effect.kind === "cancel_period_end") {
    await users.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "cancel_at_period_end",
        ...(effect.accessEndsAt ? { accessEndsAt: effect.accessEndsAt } : {}),
      },
    });
    return { status: "PROCESSED", userId: user.id };
  }

  if (effect.kind === "update_charge_date") {
    await users.update({
      where: { id: user.id },
      data: { accessEndsAt: effect.accessEndsAt },
    });
    return { status: "PROCESSED", userId: user.id };
  }

  await users.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "deleted",
      accessEndsAt: new Date(),
    },
  });
  try {
    const { cascadeCancelToTenantBilling } = await import("../billingCascade");
    await cascadeCancelToTenantBilling(context, user.id);
  } catch {
    // User access is already cut. Tenant cascade can be retried.
  }
  await voidPending(pending, parsed.transaction);
  return { status: "PROCESSED", userId: user.id };
}

/**
 * POST /api/hotmart/webhook
 * Off unless HOTMART_PRIMARY_CHECKOUT=true. The hottok is compared and never logged.
 */
export async function hotmartWebhook(
  req: Request,
  res: Response,
  context: any,
) {
  const env = readHotmartEnv();
  if (!env.enabled) {
    return res.status(404).json({ error: "Not found" });
  }
  if (
    !hottokMatches(
      headerHottok(req.headers as Record<string, unknown>),
      env.hottok,
    )
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let body: unknown;
  try {
    body = readBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const parsedResult = parseHotmartPostback(body);
  if (!parsedResult.ok) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const parsed = parsedResult.parsed;
  const events = context?.entities?.HotmartWebhookEvent;
  if (!events?.findUnique || !events?.create) {
    return res.status(500).json({ error: "Temporary failure" });
  }

  try {
    const existing = await events.findUnique({ where: { eventId: parsed.id } });
    if (existing) return res.status(200).json({ received: true });

    if (parsed.transaction && events.findFirst) {
      const prior = await events.findFirst({
        where: {
          transaction: parsed.transaction,
          event: parsed.event,
          status: "PROCESSED",
        },
      });
      if (prior) {
        await storeEvent(events, parsed, body, {
          status: "IGNORED",
          error: "duplicate_transaction",
        });
        return res.status(200).json({ received: true });
      }
    }

    if (productBlocked(parsed, env.productUcodes)) {
      await storeEvent(events, parsed, body, {
        status: "IGNORED",
        error: "unknown_product",
      });
      return res.status(200).json({ received: true });
    }

    const outcome = await applyParsed(parsed, context);
    await storeEvent(events, parsed, body, outcome);
    console.info(
      `[hotmart] event=${parsed.event} id=${parsed.id} status=${outcome.status}`,
    );
    return res.status(200).json({ received: true });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return res.status(200).json({ received: true });
    }
    console.error(
      `[hotmart] event=${parsed.event} id=${parsed.id} status=error`,
    );
    return res.status(500).json({ error: "Temporary failure" });
  }
}
