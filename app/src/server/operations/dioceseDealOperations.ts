/**
 * Platform-admin management of negotiated diocese subscriptions.
 * Offline payment (PIX / invoice). Never opens Stripe Checkout.
 */
import { HttpError } from "wasp/server";
import * as z from "zod";
import { requireAuth, requirePlatformAdmin, writeAuditLog } from "../auth/helpers";
import { validateOrThrow } from "../validation";
import {
  DIOCESE_DEAL_PLAN,
  DIOCESE_DEAL_PROCESSOR,
  DIOCESE_DEAL_STATUSES,
  canAddParishUnderDeal,
  isDioceseDealCovering,
  isManualDioceseDeal,
  normalizeDioceseDealStatus,
  toDioceseDealPublicSummary,
  type DioceseDealStatus,
} from "../../shared/dioceseDeal";
import {
  loadDioceseBilling,
  loadDioceseDealSummaries,
} from "./billingEnforcement";

const emptyToUndefined = (value: unknown) =>
  value == null || value === "" ? undefined : value;

const optionalInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(0).max(100_000).optional().nullable(),
);

const optionalDate = z.preprocess((value) => {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}, z.date().optional().nullable());

const dealStatusSchema = z.enum(DIOCESE_DEAL_STATUSES);

const upsertSchema = z
  .object({
    dioceseId: z.preprocess(emptyToUndefined, z.string().min(1).max(64).optional()),
    createDiocese: z
      .object({
        name: z.string().trim().min(3).max(160),
        country: z.string().trim().min(2).max(2).default("BR"),
        state: z.preprocess(emptyToUndefined, z.string().trim().max(2).optional()),
      })
      .optional(),
    maxParishes: z.coerce.number().int().min(1).max(10_000),
    maxClasses: optionalInt,
    maxCatechumens: optionalInt,
    maxCatechists: optionalInt,
    status: dealStatusSchema.default("ACTIVE"),
    internalNotes: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(4000).optional().nullable(),
    ),
    externalReference: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(160).optional().nullable(),
    ),
    agreedPriceCents: optionalInt,
    agreedCurrency: z.preprocess(
      emptyToUndefined,
      z.string().trim().min(3).max(3).optional(),
    ),
    startsAt: optionalDate,
    endsAt: optionalDate,
  })
  .refine((value) => Boolean(value.dioceseId) !== Boolean(value.createDiocese), {
    message: "Indique dioceseId ou createDiocese — não os dois.",
  });

const listSchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  status: z.preprocess(emptyToUndefined, dealStatusSchema.optional()),
});

function prismaStatus(status: DioceseDealStatus) {
  return status;
}

function dealPayload(args: z.infer<typeof upsertSchema>) {
  return {
    plan: DIOCESE_DEAL_PLAN,
    status: prismaStatus(args.status),
    trialEndsAt: null,
    manualDeal: true,
    processor: DIOCESE_DEAL_PROCESSOR,
    maxParishes: args.maxParishes,
    maxClasses: args.maxClasses ?? null,
    maxCatechumens: args.maxCatechumens ?? null,
    maxCatechists: args.maxCatechists ?? null,
    internalNotes: args.internalNotes ?? null,
    externalReference: args.externalReference ?? null,
    agreedPriceCents: args.agreedPriceCents ?? null,
    agreedCurrency: (args.agreedCurrency || "BRL").toUpperCase(),
    startsAt: args.startsAt ?? null,
    endsAt: args.endsAt ?? null,
  };
}

async function serializeAdminDeal(context: any, row: any) {
  const dioceseId = row.dioceseId as string;
  const dioceseName = row.diocese?.name ?? "Diocese";
  const summaries = await loadDioceseDealSummaries(context, [
    { id: dioceseId, name: dioceseName },
  ]);
  const summary = summaries.get(dioceseId) ??
    toDioceseDealPublicSummary({
      dioceseId,
      dioceseName,
      billing: row,
      parishesUsed: 0,
    });
  const covering = isDioceseDealCovering(row);
  const maxParishes = row.maxParishes ?? summary.maxParishes ?? null;
  return {
    ...summary,
    status: row.status,
    covering,
    manualDeal: true,
    maxParishes,
    maxClasses: row.maxClasses ?? null,
    maxCatechumens: row.maxCatechumens ?? null,
    maxCatechists: row.maxCatechists ?? null,
    startsAt: row.startsAt ?? null,
    endsAt: row.endsAt ?? null,
    canAddParish: canAddParishUnderDeal({
      covering,
      parishesUsed: summary.parishesUsed,
      maxParishes,
    }),
    id: row.id,
    billingId: row.id,
    internalNotes: row.internalNotes ?? null,
    externalReference: row.externalReference ?? null,
    agreedPriceCents: row.agreedPriceCents ?? null,
    agreedCurrency: row.agreedCurrency ?? "BRL",
    processor: row.processor ?? DIOCESE_DEAL_PROCESSOR,
    plan: row.plan,
    updatedAt: row.updatedAt,
  };
}

export const listDioceseDeals = async (
  rawArgs: { search?: string; status?: DioceseDealStatus } | void,
  context: any,
) => {
  requirePlatformAdmin(context.user);
  const args = validateOrThrow(listSchema, rawArgs ?? {});

  const where: Record<string, unknown> = {
    dioceseId: { not: null },
    OR: [{ manualDeal: true }, { processor: DIOCESE_DEAL_PROCESSOR }],
  };
  if (args.status) {
    where.status = args.status;
  }
  if (args.search) {
    where.diocese = {
      name: { contains: args.search, mode: "insensitive" },
    };
  }

  const rows = await context.entities.TenantBilling.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { diocese: { select: { id: true, name: true, state: true, country: true } } },
  });

  const summaries = await loadDioceseDealSummaries(
    context,
    (rows as any[]).map((row) => ({
      id: row.dioceseId,
      name: row.diocese?.name ?? "Diocese",
    })),
  );

  return (rows as any[]).map((row) => {
    const summary = summaries.get(row.dioceseId);
    return {
      ...(summary ??
        toDioceseDealPublicSummary({
          dioceseId: row.dioceseId,
          dioceseName: row.diocese?.name ?? "Diocese",
          billing: row,
          parishesUsed: 0,
        })),
      id: row.id,
      billingId: row.id,
      internalNotes: row.internalNotes ?? null,
      externalReference: row.externalReference ?? null,
      agreedPriceCents: row.agreedPriceCents ?? null,
      agreedCurrency: row.agreedCurrency ?? "BRL",
      processor: row.processor ?? DIOCESE_DEAL_PROCESSOR,
      plan: row.plan,
      diocese: row.diocese,
      updatedAt: row.updatedAt,
    };
  });
};

export const getDioceseDeal = async (
  rawArgs: { dioceseId: string },
  context: any,
) => {
  requirePlatformAdmin(context.user);
  const dioceseId = rawArgs.dioceseId?.trim();
  if (!dioceseId) throw new HttpError(400, "dioceseId é obrigatório.");

  const diocese = await context.entities.Diocese.findUnique({
    where: { id: dioceseId },
    select: { id: true, name: true, state: true, country: true },
  });
  if (!diocese) throw new HttpError(404, "Diocese não encontrada.");

  const row = await context.entities.TenantBilling.findUnique({
    where: { dioceseId },
    include: { diocese: { select: { id: true, name: true, state: true, country: true } } },
  });
  if (!row) {
    const summary = toDioceseDealPublicSummary({
      dioceseId: diocese.id,
      dioceseName: diocese.name,
      billing: null,
      parishesUsed: (
        await loadDioceseDealSummaries(context, [diocese])
      ).get(diocese.id)?.parishesUsed ?? 0,
    });
    return { ...summary, id: null, billingId: null, diocese, exists: false };
  }
  return { ...(await serializeAdminDeal(context, row)), diocese, exists: true };
};

export const upsertDioceseDeal = async (rawArgs: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const args = validateOrThrow(upsertSchema, rawArgs);

  if (args.startsAt && args.endsAt && args.endsAt < args.startsAt) {
    throw new HttpError(400, "A data final do acordo não pode ser anterior ao início.");
  }

  let dioceseId = args.dioceseId;
  if (args.createDiocese) {
    const created = await context.entities.Diocese.create({
      data: {
        name: args.createDiocese.name,
        country: args.createDiocese.country || "BR",
        state: args.createDiocese.state?.toUpperCase() || null,
      },
    });
    dioceseId = created.id;
    await writeAuditLog(context, "CREATE", "Diocese", created.id, {
      operation: "DIOCESE_CREATE_WITH_DEAL",
    });
  }

  const diocese = await context.entities.Diocese.findUnique({
    where: { id: dioceseId },
    select: { id: true, name: true },
  });
  if (!diocese) throw new HttpError(404, "Diocese não encontrada.");

  const existing = await context.entities.TenantBilling.findUnique({
    where: { dioceseId },
  });
  const data = dealPayload(args);

  const row = existing
    ? await context.entities.TenantBilling.update({
        where: { id: existing.id },
        data,
        include: { diocese: { select: { id: true, name: true, state: true, country: true } } },
      })
    : await context.entities.TenantBilling.create({
        data: { dioceseId, ...data },
        include: { diocese: { select: { id: true, name: true, state: true, country: true } } },
      });

  await writeAuditLog(context, existing ? "UPDATE" : "CREATE", "TenantBilling", row.id, {
    operation: existing ? "DIOCESE_DEAL_UPDATE" : "DIOCESE_DEAL_CREATE",
    dioceseId,
    status: args.status,
    maxParishes: args.maxParishes,
    processor: DIOCESE_DEAL_PROCESSOR,
    previousStatus: existing?.status ?? null,
  });

  return serializeAdminDeal(context, row);
};

export const setDioceseDealStatus = async (
  rawArgs: { dioceseId: string; status: DioceseDealStatus },
  context: any,
) => {
  requirePlatformAdmin(context.user);
  const dioceseId = rawArgs.dioceseId?.trim();
  const status = normalizeDioceseDealStatus(rawArgs.status);
  if (!dioceseId) throw new HttpError(400, "dioceseId é obrigatório.");
  if (!status) throw new HttpError(400, "Status inválido para o acordo diocesano.");

  const existing = await context.entities.TenantBilling.findUnique({
    where: { dioceseId },
    include: { diocese: { select: { id: true, name: true, state: true, country: true } } },
  });
  if (!existing) {
    throw new HttpError(404, "Esta diocese ainda não tem um acordo pastoral.");
  }

  const row = await context.entities.TenantBilling.update({
    where: { id: existing.id },
    data: {
      status,
      manualDeal: true,
      processor: existing.processor || DIOCESE_DEAL_PROCESSOR,
      plan: isManualDioceseDeal(existing) ? existing.plan : DIOCESE_DEAL_PLAN,
    },
    include: { diocese: { select: { id: true, name: true, state: true, country: true } } },
  });

  await writeAuditLog(context, "UPDATE", "TenantBilling", row.id, {
    operation: "DIOCESE_DEAL_STATUS",
    dioceseId,
    from: existing.status,
    to: status,
  });

  return serializeAdminDeal(context, row);
};

/**
 * Read-only summary for DIOCESE_ADMIN (cúria). Commercial terms stay hidden.
 */
export const getMyDioceseDeal = async (
  rawArgs: { dioceseId?: string } | void,
  context: any,
) => {
  requireAuth(context.user);

  let dioceseId = rawArgs && "dioceseId" in rawArgs ? rawArgs.dioceseId : undefined;

  if (!dioceseId) {
    const adminMembership = await context.entities.Membership.findFirst({
      where: {
        userId: context.user.id,
        status: "ACTIVE",
        role: { in: ["DIOCESE_ADMIN", "SUPER_ADMIN"] },
        parish: { dioceseId: { not: null } },
      },
      select: { parish: { select: { dioceseId: true, type: true } } },
    });
    dioceseId = adminMembership?.parish?.dioceseId ?? undefined;
  }

  if (!dioceseId) {
    if (context.user.isAdmin) return null;
    throw new HttpError(403, "Apenas a cúria diocesana consulta este acordo.");
  }

  if (!context.user.isAdmin) {
    const allowed = await context.entities.Membership.findFirst({
      where: {
        userId: context.user.id,
        status: "ACTIVE",
        role: { in: ["DIOCESE_ADMIN", "SUPER_ADMIN"] },
        parish: { dioceseId },
      },
      select: { id: true },
    });
    if (!allowed) {
      throw new HttpError(403, "Apenas a cúria desta diocese consulta o acordo.");
    }
  }

  const diocese = await context.entities.Diocese.findUnique({
    where: { id: dioceseId },
    select: { id: true, name: true },
  });
  if (!diocese) throw new HttpError(404, "Diocese não encontrada.");

  const summaries = await loadDioceseDealSummaries(context, [diocese]);
  const summary = summaries.get(diocese.id);
  const billing = await loadDioceseBilling(context, diocese.id);
  return {
    ...(summary ??
      toDioceseDealPublicSummary({
        dioceseId: diocese.id,
        dioceseName: diocese.name,
        billing,
        parishesUsed: 0,
      })),
    hasDeal: Boolean(billing),
  };
};
