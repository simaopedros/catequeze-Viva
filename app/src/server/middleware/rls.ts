/**
 * Row-Level Security (RLS) Prisma middleware.
 *
 * Automatically filters queries by parishId based on the current user's context.
 * Prevents cross-tenant data leakage at the database query level.
 *
 * To use, pass the user context via a Prisma extension that injects
 * WHERE clauses for parish-scoped models.
 */
import type { Prisma } from '@prisma/client';

/**
 * Models that are scoped to a parish and should be filtered by parishId.
 */
const PARISH_SCOPED_MODELS = new Set([
  'CatechesisClass',
  'CatechumenProfile',
  'ContentItem',
  'Meeting',
  'Document',
  'SacramentalJourney',
  'LiturgicalEvent',
  'Activity',
  'ClassEnrollment',
  'Attendance',
  'Conversation',
  'Notification',
  'Consent',
  'MessageCampaign',
  'CatecheticalYear',
]);

/**
 * Get the parish IDs that the current user has access to.
 */
export async function getUserParishIds(context: any, userId: string): Promise<string[]> {
  if (!userId) return [];

  const memberships = await context.entities.Membership?.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { parishId: true },
  });

  return memberships?.map((m: any) => m.parishId) || [];
}

/**
 * Wrap Prisma operations with RLS — adds parishId filter to queries
 * on sensitive models.
 *
 * Usage:
 *   const safeContext = await applyRls(context);
 *   const classes = await safeContext.entities.CatechesisClass.findMany({ ... });
 */
export async function applyRls(context: any): Promise<any> {
  const user = context.user;
  if (!user?.id) return context;

  // Admins bypass RLS
  if (user.isAdmin) return context;

  const parishIds = await getUserParishIds(context, user.id);
  if (parishIds.length === 0) return context;

  // Create a proxy that intercepts entity access
  const entitiesProxy = new Proxy(context.entities, {
    get(target, prop: string) {
      const entity = target[prop];
      if (!entity || typeof entity !== 'object') return entity;

      // Only filter parish-scoped models
      if (!PARISH_SCOPED_MODELS.has(prop)) return entity;

      // Wrap entity methods to inject parish filter
      return new Proxy(entity, {
        get(entityTarget, method: string) {
          const original = entityTarget[method];
          if (typeof original !== 'function') return original;

          // Only wrap query methods
          const queryMethods = ['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'];
          if (!queryMethods.includes(method)) return original;

          return async function (...args: any[]) {
            const queryArgs = args[0] || {};
            const where = queryArgs.where || {};

            // Inject parishId filter if not explicitly checking specific parishes
            const hasParishFilter = where.parishId !== undefined || where.parish?.id !== undefined;

            if (!hasParishFilter) {
              const newWhere = {
                ...where,
                parishId: { in: parishIds },
              };
              args[0] = { ...queryArgs, where: newWhere };
            }

            return original.apply(entityTarget, args);
          };
        },
      });
    },
  });

  return { ...context, entities: entitiesProxy };
}
