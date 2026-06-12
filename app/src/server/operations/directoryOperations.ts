import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';
import { getDioceseParishIds } from '../auth/helpers';
import {
  isCacheReady,
  ensureCacheReady,
  getCachedDirectoryEntry,
  getCachedDirectoryByPart,
  searchDirectoryInCache,
  getCachedDirectoryParts,
} from '../cache/referenceCache';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'CONTENT_REVIEWER', 'PERSONAL_OWNER'];

/**
 * Resolve locale: explicit arg takes precedence, then user session, then pt-BR.
 */
function resolveLocale(context: any, explicitLocale?: string | null): string {
  return explicitLocale || context.user?.locale || 'pt-BR';
}

async function getParishIds(context: any): Promise<string[]> {
  if (context.user?.isAdmin) return [];
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { parishId: true, role: true },
  });
  const ids = memberships.map((m: any) => m.parishId);

  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) if (!ids.includes(id)) ids.push(id);
  }

  const personal = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal && !ids.includes(personal.id)) ids.push(personal.id);

  return ids;
}

async function assertCanModifyContent(context: any, contentId: string) {
  const item = await context.entities.ContentItem.findUnique({
    where: { id: contentId },
    select: { parishId: true, createdById: true },
  });
  if (!item) throw new HttpError(404, 'Conteúdo não encontrado.');

  if (context.user?.isAdmin) return;
  if (item.createdById === context.user.id) return;

  if (item.parishId) {
    const parishIds = await getParishIds(context);
    if (!parishIds.includes(item.parishId)) {
      throw new HttpError(403, 'Você não tem acesso a este conteúdo.');
    }
    const member = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: item.parishId, status: MembershipStatus.ACTIVE },
      select: { role: true },
    });
    if (!member || !ALLOWED_ROLES.includes(member.role)) {
      throw new HttpError(403, 'Sem permissão para modificar conteúdo.');
    }
    return;
  }

  throw new HttpError(403, 'Sem permissão para modificar este conteúdo.');
}

// ─── Directory Search & Browse ──────────────────────────────────────────────

export const searchDirectory = async (args: { query: string; limit?: number; locale?: string | null }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.query || args.query.length < 2) return [];

  const locale = resolveLocale(context, args.locale);

  if (await ensureCacheReady()) {
    return searchDirectoryInCache(args.query, locale, args.limit || 20);
  }

  // Fallback: DB query
  const q = args.query.trim();
  const limit = args.limit || 20;

  const num = parseInt(q);
  if (!isNaN(num)) {
    const entry = await context.entities.DirectoryEntry.findUnique({
      where: { number_locale: { number: num, locale } },
    });
    if (entry) return [entry];
  }

  return context.entities.DirectoryEntry.findMany({
    where: {
      locale,
      OR: [
        { content: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { chapter: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { number: 'asc' },
  });
};

export const listDirectoryByPart = async (args: { part: string; locale?: string | null }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const locale = resolveLocale(context, args.locale);

  if (await ensureCacheReady()) {
    return getCachedDirectoryByPart(args.part, locale);
  }

  // Fallback: DB query
  return context.entities.DirectoryEntry.findMany({
    where: { part: args.part, locale },
    orderBy: { number: 'asc' },
  });
};

export const getDirectoryEntry = async (args: { number: number; locale?: string | null }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const locale = resolveLocale(context, args.locale);

  if (await ensureCacheReady()) {
    const entry = getCachedDirectoryEntry(args.number, locale);
    if (!entry) throw new HttpError(404, 'Entrada não encontrada.');
    return entry;
  }

  // Fallback: DB query
  const entry = await context.entities.DirectoryEntry.findUnique({
    where: { number_locale: { number: args.number, locale } },
  });
  if (!entry) throw new HttpError(404, 'Entrada não encontrada.');
  return entry;
};

export const listDirectoryParts = async (args: { locale?: string | null } | void, context: any) => {
  if (!context.user) throw new HttpError(401);
  const a = args || {};
  const locale = resolveLocale(context, (a as any).locale);

  if (await ensureCacheReady()) {
    return getCachedDirectoryParts(locale);
  }

  // Fallback: DB query
  const entries = await context.entities.DirectoryEntry.findMany({
    where: { locale },
    select: { part: true, chapter: true, title: true, number: true },
    orderBy: { number: 'asc' },
    distinct: ['chapter'],
  });
  return entries;
};

// ─── Directory References (content linking) ─────────────────────────────────

export const addDirectoryRef = async (args: { contentId: string; entryId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  await assertCanModifyContent(context, args.contentId);

  const existing = await context.entities.ContentDirectoryReference.findFirst({
    where: { contentId: args.contentId, entryId: args.entryId },
  });
  if (existing) return existing;
  return context.entities.ContentDirectoryReference.create({
    data: { contentId: args.contentId, entryId: args.entryId },
  });
};

export const removeDirectoryRef = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const ref = await context.entities.ContentDirectoryReference.findUnique({
    where: { id: args.id },
    select: { contentId: true },
  });
  if (!ref) return { success: true };

  await assertCanModifyContent(context, ref.contentId);
  await context.entities.ContentDirectoryReference.delete({ where: { id: args.id } });
  return { success: true };
};
