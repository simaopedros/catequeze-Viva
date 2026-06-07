/**
 * Row-Level Security (RLS) Prisma proxy — optional defence-in-depth layer.
 *
 * Primary access control lives in auth/helpers.ts (requireParishRole, etc.).
 * Use `withRlsContext(context)` at the start of an operation when you want
 * automatic parishId filtering on read queries.
 *
 * Only models with a direct `parishId` column are supported.
 */
import { getUserParishIds } from './rlsParishIds';

export { getUserParishIds };

/** Models with a direct parishId column in schema.prisma */
const PARISH_SCOPED_MODELS = new Set([
  'CatechesisClass',
  'CatechumenProfile',
  'ContentItem',
  'Household',
  'Community',
  'LiturgicalEvent',
  'Activity',
  'Conversation',
  'Notification',
  'MessageCampaign',
  'CatecheticalYear',
]);

/**
 * Wrap Prisma operations with RLS — adds parishId filter to queries
 * on parish-scoped models.
 */
export async function withRlsContext(context: any): Promise<any> {
  const user = context.user;
  if (!user?.id) return context;
  if (user.isAdmin) return context;

  const parishIds = await getUserParishIds(context, user.id);
  if (parishIds.length === 0) return context;

  const entitiesProxy = new Proxy(context.entities, {
    get(target, prop: string) {
      const entity = target[prop];
      if (!entity || typeof entity !== 'object') return entity;
      if (!PARISH_SCOPED_MODELS.has(prop)) return entity;

      return new Proxy(entity, {
        get(entityTarget, method: string) {
          const original = entityTarget[method];
          if (typeof original !== 'function') return original;

          const queryMethods = ['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'];
          if (!queryMethods.includes(method)) return original;

          return async function (...args: any[]) {
            const queryArgs = args[0] || {};
            const where = queryArgs.where || {};
            const hasParishFilter = where.parishId !== undefined || where.parish?.id !== undefined;

            if (!hasParishFilter) {
              args[0] = {
                ...queryArgs,
                where: { ...where, parishId: { in: parishIds } },
              };
            }

            return original.apply(entityTarget, args);
          };
        },
      });
    },
  });

  return { ...context, entities: entitiesProxy };
}

/** @deprecated Use withRlsContext */
export const applyRls = withRlsContext;
