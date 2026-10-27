import { User } from "wasp/entities";
import { PrismaClient } from "wasp/server";
import { SubscriptionStatus } from "./plans";

export async function fetchUserPaymentProcessorUserId(
  userId: User["id"],
  prismaUserDelegate: PrismaClient["user"],
): Promise<string | null> {
  const user = await prismaUserDelegate.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      paymentProcessorUserId: true,
    },
  });

  return user.paymentProcessorUserId;
}

interface UpdateUserPaymentProcessorUserIdArgs {
  userId: User["id"];
  paymentProcessorUserId: NonNullable<User["paymentProcessorUserId"]>;
}

export function updateUserPaymentProcessorUserId(
  { userId, paymentProcessorUserId }: UpdateUserPaymentProcessorUserIdArgs,
  prismaUserDelegate: PrismaClient["user"],
): Promise<User> {
  return prismaUserDelegate.update({
    where: {
      id: userId,
    },
    data: {
      paymentProcessorUserId,
    },
  });
}

interface UpdateUserSubscriptionArgs {
  paymentProcessorUserId: NonNullable<User["paymentProcessorUserId"]>;
  subscriptionStatus: SubscriptionStatus;
  paymentPlanId?: string;
  datePaid?: Date;
  trialEndsAt?: Date | null;
  /** Persist when available; never replace a different non-null existing value. */
  stripeSubscriptionId?: string | null;
}

/**
 * Decide whether to write `stripeSubscriptionId` onto User.
 * - null/undefined incoming → do not touch the column
 * - existing null → set incoming
 * - existing equals incoming → set (idempotent)
 * - existing different non-null → keep existing (do not overwrite)
 */
export function shouldPersistStripeSubscriptionId(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): incoming is string {
  if (!incoming) return false;
  if (!existing) return true;
  return existing === incoming;
}

export async function updateUserSubscription(
  {
    paymentProcessorUserId,
    paymentPlanId,
    subscriptionStatus,
    datePaid,
    trialEndsAt,
    stripeSubscriptionId,
  }: UpdateUserSubscriptionArgs,
  userDelegate: PrismaClient["user"],
): Promise<User> {
  let nextStripeSubscriptionId: string | undefined;
  if (stripeSubscriptionId) {
    const existing = await userDelegate.findUnique({
      where: { paymentProcessorUserId },
      select: { stripeSubscriptionId: true },
    });
    if (
      shouldPersistStripeSubscriptionId(
        existing?.stripeSubscriptionId,
        stripeSubscriptionId,
      )
    ) {
      nextStripeSubscriptionId = stripeSubscriptionId;
    }
  }

  return userDelegate.update({
    where: {
      paymentProcessorUserId,
    },
    data: {
      subscriptionPlan: paymentPlanId,
      subscriptionStatus,
      datePaid,
      ...(trialEndsAt !== undefined ? { trialEndsAt } : {}),
      ...(nextStripeSubscriptionId !== undefined
        ? { stripeSubscriptionId: nextStripeSubscriptionId }
        : {}),
    },
  });
}

interface UpdateUserCreditsArgs {
  paymentProcessorUserId: NonNullable<User["paymentProcessorUserId"]>;
  numOfCreditsPurchased: number;
  datePaid: Date;
}

export function updateUserCredits(
  {
    paymentProcessorUserId,
    numOfCreditsPurchased,
    datePaid,
  }: UpdateUserCreditsArgs,
  userDelegate: PrismaClient["user"],
): Promise<User> {
  return userDelegate.update({
    where: {
      paymentProcessorUserId,
    },
    data: {
      credits: { increment: numOfCreditsPurchased },
      datePaid,
    },
  });
}
