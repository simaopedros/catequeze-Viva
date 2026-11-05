import { randomBytes } from "node:crypto";
import { prisma } from "wasp/server";
import {
  createProviderId,
  createUser,
  findAuthIdentity,
  updateAuthIdentityProviderData,
} from "wasp/auth/utils";
import { hasUsablePassword, splitBuyerName } from "./buyerAccount";

export class BuyerAlreadyExists extends Error {
  constructor() {
    super("buyer_already_exists");
    this.name = "BuyerAlreadyExists";
  }
}

export type EmailIdentityState = {
  hasPassword: boolean;
  isEmailVerified: boolean;
  providerData: Record<string, unknown>;
};

/** Not a password and not a verifier. Login fails until the reset action replaces it. */
export function unsetPasswordMarker(): string {
  return `unset.${randomBytes(32).toString("base64url")}`;
}

export function serializeEmailProviderData(
  verified: boolean,
  hashedPassword = unsetPasswordMarker(),
): string {
  return JSON.stringify({
    hashedPassword,
    isEmailVerified: verified,
    emailVerificationSentAt: null,
    passwordResetSentAt: null,
  });
}

function parseProviderData(
  raw: string | null | undefined,
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function isUniqueConflict(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code === "P2002") return true;
  return (error as { statusCode?: number } | null)?.statusCode === 422;
}

export async function readEmailIdentity(
  email: string,
): Promise<EmailIdentityState | null> {
  const identity = await findAuthIdentity(createProviderId("email", email));
  if (!identity) return null;
  const providerData = parseProviderData(identity.providerData);
  return {
    hasPassword: hasUsablePassword(providerData.hashedPassword),
    isEmailVerified: providerData.isEmailVerified === true,
    providerData,
  };
}

/**
 * Creates a verified email user with no usable password. The plaintext is
 * never generated. A concurrent create for the same email surfaces as
 * BuyerAlreadyExists so the caller can reload the row that won the race.
 */
export async function createVerifiedBuyer(args: {
  email: string;
  buyerName: string | null;
}): Promise<{ id: string }> {
  const names = splitBuyerName(args.buyerName, args.email);
  try {
    const user = await createUser(
      createProviderId("email", args.email),
      serializeEmailProviderData(true),
      {
        email: args.email,
        username: args.email,
        firstName: names.firstName,
        lastName: names.lastName,
        emailVerifiedAt: new Date(),
        termsAcceptanceRequired: true,
        isAdmin: false,
        locale: "pt-BR",
        subscriptionPlan: null,
      } as any,
    );
    return { id: user.id };
  } catch (error) {
    if (isUniqueConflict(error)) throw new BuyerAlreadyExists();
    throw error;
  }
}

/** Marks the email provider verified, creating it when the account has none. */
export async function confirmBuyerEmail(email: string): Promise<void> {
  const providerId = createProviderId("email", email);
  const identity = await findAuthIdentity(providerId);
  if (!identity) {
    await ensureEmailIdentity(email);
    return;
  }
  const providerData = parseProviderData(identity.providerData);
  if (providerData.isEmailVerified === true) return;
  await updateAuthIdentityProviderData(providerId, providerData as any, {
    isEmailVerified: true,
  });
}

async function ensureEmailIdentity(email: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user?.id) throw new Error("buyer_user_missing");
  const auth = await prisma.auth.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  const providerData = serializeEmailProviderData(true);
  if (!auth) {
    await prisma.auth.create({
      data: {
        userId: user.id,
        identities: {
          create: {
            providerName: "email",
            providerUserId: email,
            providerData,
          },
        },
      },
    });
    return;
  }
  try {
    await prisma.authIdentity.create({
      data: {
        providerName: "email",
        providerUserId: email,
        providerData,
        authId: auth.id,
      },
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
  }
}
