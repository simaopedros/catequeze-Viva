import { HttpError } from 'wasp/server';
import * as z from 'zod';
import { requireAuth, getUserMembership, COORDINATOR_ROLES, getDioceseParishIds } from '../auth/helpers';
import { validateOrThrow } from '../validation';

// ─── Shared schemas ─────────────────────────────────────────────────────

const createCatecheticalYearSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.').max(100),
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Data de início inválida.'),
  endDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Data de fim inválida.'),
  parishId: z.string().optional(),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'A data de início deve ser anterior à data de fim.', path: ['endDate'] },
);

const createMessageCampaignSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório.').max(200),
  body: z.string().min(1, 'Corpo da mensagem é obrigatório.'),
  channel: z.enum(['email', 'whatsapp', 'sms']).optional().default('email'),
  segment: z.string().optional().default('all_parish'),
  parishId: z.string().optional(),
});

const VALID_LOCALES = ['pt-BR', 'en', 'es'] as const;

function isValidTimeZone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

const updateLocalePreferenceSchema = z.object({
  locale: z.enum(VALID_LOCALES),
  timezone: z.string().trim().min(1).max(100).refine(isValidTimeZone, 'Fuso horário inválido.'),
});

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Build parishId list from the user's active memberships, expanded by diocese if applicable. */
async function getEffectiveParishIds(context: any): Promise<string[]> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });
  const ids = memberships.map((m: any) => m.parishId);

  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  return ids;
}

/**
 * Validates that the user has write-access to a given parishId.
 * Admins always pass. Non-admins must have a coordinator+ role
 * (PERSONAL_OWNER, PARISH_COORDINATOR, DIOCESE_ADMIN) on the parish.
 */
async function assertCanWriteParish(context: any, parishId: string) {
  if (context.user.isAdmin) return;

  // Check personal workspace ownership
  const personal = await context.entities.Parish.findFirst({
    where: { id: parishId, ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal) return;

  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId, status: 'ACTIVE' },
    select: { role: true },
  });
  const allowedRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];
  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new HttpError(403, 'Você não tem permissão para gerenciar esta paróquia.');
  }
}

/** Resolve a parishId from args, falling back to the first active membership (or personal workspace). */
async function resolveParishId(context: any, args: { parishId?: string }): Promise<string | undefined> {
  let parishId = args.parishId;
  if (!parishId) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true },
    });
    if (!membership) {
      const personal = await context.entities.Parish.findFirst({
        where: { ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      parishId = personal?.id;
    } else {
      parishId = membership.parishId;
    }
  }
  return parishId || undefined;
}

// ─── Queries ────────────────────────────────────────────────────────────

/** List catechetical years scoped to the user's parishes. */
export const listCatecheticalYears = async (_args: void, context: any) => {
  requireAuth(context.user);

  if (context.user.isAdmin) {
    return context.entities.CatecheticalYear.findMany({ orderBy: { startDate: 'desc' } });
  }

  const parishIds = await getEffectiveParishIds(context);
  if (parishIds.length === 0) return [];

  return context.entities.CatecheticalYear.findMany({
    where: { parishId: { in: parishIds } },
    orderBy: { startDate: 'desc' },
  });
};

/** List message campaigns scoped to the user's parishes or own creations. */
export const listMessageCampaigns = async (_args: void, context: any) => {
  requireAuth(context.user);

  if (context.user.isAdmin) {
    return context.entities.MessageCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  }

  const parishIds = await getEffectiveParishIds(context);
  if (parishIds.length === 0) return [];

  return context.entities.MessageCampaign.findMany({
    where: {
      OR: [
        { parishId: { in: parishIds } },
        { createdById: context.user.id },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
};

/** Server-side CSV export: classes with enrollment counts, scoped by parish. */
export const exportReport = async (_args: void, context: any) => {
  requireAuth(context.user);

  let whereClause: any = { status: 'ACTIVE' };
  if (!context.user.isAdmin) {
    const parishIds = await getEffectiveParishIds(context);
    if (parishIds.length === 0) return [];
    whereClause.parishId = { in: parishIds };
  }

  return context.entities.CatechesisClass.findMany({
    where: whereClause,
    select: { id: true, name: true, _count: { select: { enrollments: true } } },
  });
};

// ─── Actions ────────────────────────────────────────────────────────────

export const createCatecheticalYear = async (
  args: { name: string; startDate: string; endDate: string; parishId?: string },
  context: any,
) => {
  requireAuth(context.user);
  const validated = validateOrThrow(createCatecheticalYearSchema, args);

  const parishId = await resolveParishId(context, validated);
  if (!parishId && !context.user.isAdmin) {
    throw new HttpError(400, 'Você não está vinculado a nenhuma paróquia.');
  }

  if (parishId) {
    await assertCanWriteParish(context, parishId);
  }

  return context.entities.CatecheticalYear.create({
    data: {
      name: validated.name,
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      parishId: parishId || undefined,
    },
  });
};

export const createMessageCampaign = async (
  args: { title: string; body: string; channel: string; segment: string; parishId?: string },
  context: any,
) => {
  requireAuth(context.user);
  const validated = validateOrThrow(createMessageCampaignSchema, args);

  const parishId = await resolveParishId(context, validated);
  if (!parishId && !context.user.isAdmin) {
    throw new HttpError(400, 'Você não está vinculado a nenhuma paróquia.');
  }

  if (parishId) {
    await assertCanWriteParish(context, parishId);
  }

  return context.entities.MessageCampaign.create({
    data: {
      title: validated.title,
      body: validated.body,
      channel: validated.channel,
      segment: validated.segment,
      status: 'DRAFT',
      createdById: context.user.id,
      parishId: parishId || undefined,
    },
  });
};

export const updateLocalePreference = async (
  args: { locale: string; timezone: string },
  context: any,
) => {
  requireAuth(context.user);
  const validated = validateOrThrow(updateLocalePreferenceSchema, args);

  return context.entities.User.update({
    where: { id: context.user.id },
    data: { locale: validated.locale, timezone: validated.timezone },
  });
};
