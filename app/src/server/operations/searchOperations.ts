import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';
import { getDioceseParishIds } from '../auth/helpers';
import {
  isCacheReady,
  triggerBackgroundLoad,
  searchBibleInCache,
  searchCatechismInCache,
  searchDirectoryInCache,
} from '../cache/referenceCache';

const MIN_CHARS = 2;
const MAX_RESULTS_PER_CATEGORY = 3;

// ─── Request-scoped parish ID cache ──────────────────────────────────────────
// Avoids repeated Membership queries within the same request.
const parishIdsRequestCache = new WeakMap<object, Promise<string[]>>();

async function getParishIdsCached(context: any): Promise<string[]> {
  // Use the request object (context.req or context) as a key.
  // WeakMap ensures entries are garbage-collected when the request is done.
  const key = context.req || context;
  const existing = parishIdsRequestCache.get(key);
  if (existing) return existing;

  const promise = getParishIds(context);
  parishIdsRequestCache.set(key, promise);
  return promise;
}

async function getParishIds(context: any): Promise<string[]> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { parishId: true, role: true },
  });
  const ids = memberships.map((m: any) => m.parishId);

  // DIOCESE_ADMIN: include all parishes in the diocese
  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  // Include personal workspace
  const personal = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal && !ids.includes(personal.id)) ids.push(personal.id);

  return ids;
}

async function safeQuery<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

export const globalSearch = async (args: { query: string; locale?: string | null }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.query || args.query.trim().length < MIN_CHARS) return [];

  const q = args.query.trim();
  const limit = MAX_RESULTS_PER_CATEGORY;
  const locale = args.locale || context.user.locale || 'pt-BR';

  const isAdmin = context.user.isAdmin;
  const parishIds = isAdmin ? [] : await getParishIdsCached(context);
  if (!isAdmin && parishIds.length === 0) return [];

  const parishFilter = isAdmin ? {} : { parishId: { in: parishIds } };

  // Reference data: serve from cache if ready, otherwise trigger background load
  const cacheReady = isCacheReady();
  if (!cacheReady) {
    triggerBackgroundLoad();
  }
  const bibleResults = cacheReady
    ? searchBibleInCache(q, locale, limit)
    : [];
  const catechismResults = cacheReady
    ? searchCatechismInCache(q, locale, limit)
    : [];
  const directoryResults = cacheReady
    ? searchDirectoryInCache(q, locale, limit)
    : [];

  const [
    catechumens,
    classes,
    contentItems,
    bibleVersesDb,
    catechismEntriesDb,
    directoryEntriesDb,
    households,
    sacramentalJourneys,
    documents,
    parishes,
    communities,
  ] = await Promise.all([
    safeQuery(() =>
      context.entities.CatechumenProfile.findMany({
        where: isAdmin
          ? {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {
              AND: [
                {
                  OR: [
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName: { contains: q, mode: 'insensitive' } },
                  ],
                },
                {
                  OR: [
                    { enrollments: { some: { class: parishFilter } } },
                    { household: parishFilter },
                    { parishId: { in: parishIds } },
                  ],
                },
              ],
            },
        select: { id: true, firstName: true, lastName: true },
        take: limit,
      })
    ),

    safeQuery(() =>
      context.entities.CatechesisClass.findMany({
        where: { name: { contains: q, mode: 'insensitive' }, ...parishFilter },
        select: { id: true, name: true, parish: { select: { name: true } } },
        take: limit,
      })
    ),

    safeQuery(() =>
      context.entities.ContentItem.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { theme: { contains: q, mode: 'insensitive' } },
          ],
          status: { in: ['APPROVED', 'PUBLISHED'] },
          ...parishFilter,
        },
        select: { id: true, title: true, theme: true },
        take: limit,
      })
    ),

    // DB fallbacks for reference data (only used when cache is not ready)
    cacheReady
      ? Promise.resolve([])
      : safeQuery(() =>
          context.entities.BibleVerse.findMany({
            where: { text: { contains: q, mode: 'insensitive' }, locale },
            select: {
              id: true, text: true, number: true,
              chapter: { select: { number: true, book: { select: { name: true, abbreviation: true } } } },
            },
            take: limit,
          })
        ),

    cacheReady
      ? Promise.resolve([])
      : safeQuery(() =>
          context.entities.CatechismEntry.findMany({
            where: {
              locale,
              OR: [
                { question: { contains: q, mode: 'insensitive' } },
                { answer: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: { id: true, number: true, question: true, category: true },
            take: limit,
          })
        ),

    cacheReady
      ? Promise.resolve([])
      : safeQuery(() =>
          context.entities.DirectoryEntry.findMany({
            where: { content: { contains: q, mode: 'insensitive' }, locale },
            select: { id: true, number: true, content: true, part: true },
            take: limit,
          })
        ),

    safeQuery(() =>
      context.entities.Household.findMany({
        where: { name: { contains: q, mode: 'insensitive' }, ...parishFilter },
        select: { id: true, name: true },
        take: limit,
      })
    ),

    // SacramentalJourney — filter via catechumenProfile relation
    safeQuery(() =>
      context.entities.SacramentalJourney.findMany({
        where: {
          catechumenProfile: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
            ...(isAdmin ? {} : {
              enrollments: { some: { class: parishFilter } },
            }),
          },
        },
        select: {
          id: true,
          catechumenProfile: { select: { id: true, firstName: true, lastName: true } },
          template: { select: { sacrament: { select: { name: true } } } },
        },
        take: limit,
      })
    ),

    // Documents — no parishId; search by name only (scoped for admin, otherwise through catechumen)
    safeQuery(() =>
      isAdmin
        ? context.entities.Document.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            select: { id: true, name: true, type: true },
            take: limit,
          })
        : context.entities.Document.findMany({
            where: {
              name: { contains: q, mode: 'insensitive' },
              catechumenProfile: {
                enrollments: { some: { class: parishFilter } },
              },
            },
            select: { id: true, name: true, type: true },
            take: limit,
          })
    ),

    safeQuery(() =>
      isAdmin
        ? context.entities.Parish.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            select: { id: true, name: true },
            take: limit,
          })
        : []
    ),

    safeQuery(() =>
      isAdmin
        ? context.entities.Community.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            select: { id: true, name: true, type: true },
            take: limit,
          })
        : context.entities.Community.findMany({
            where: { name: { contains: q, mode: 'insensitive' }, parishId: { in: parishIds } },
            select: { id: true, name: true, type: true },
            take: limit,
          })
    ),
  ]);

  const results: any[] = [];

  catechumens.forEach((c: any) =>
    results.push({ id: c.id, type: 'catechumen', module: 'catechumen', label: `${c.firstName} ${c.lastName}`, description: '', route: `/app/catechumens/${c.id}` })
  );

  classes.forEach((c: any) =>
    results.push({ id: c.id, type: 'class', module: 'class', label: c.name, description: c.parish?.name || '', route: `/app/classes/${c.id}` })
  );

  contentItems.forEach((ci: any) =>
    results.push({ id: ci.id, type: 'content', module: 'content', label: ci.title, description: ci.theme || '', route: `/app/content-library/${ci.id}` })
  );

  // Bible results: prefer cache, fall back to DB
  const bibleSource = cacheReady ? bibleResults : bibleVersesDb;
  bibleSource.forEach((v: any) => {
    const ref = `${v.chapter?.book?.abbreviation || v.chapter?.book?.name} ${v.chapter?.number}:${v.number}`;
    results.push({ id: v.id, type: 'bible', module: 'bible', label: ref, description: (v.text || '').substring(0, 100), route: `/app/bible?ref=${encodeURIComponent(ref)}` });
  });

  // Catechism results: prefer cache, fall back to DB
  const catechismSource = cacheReady ? catechismResults : catechismEntriesDb;
  catechismSource.forEach((e: any) =>
    results.push({ id: e.id, type: 'catechism', module: 'catechism', label: `#${e.number} ${(e.question || '').substring(0, 80)}`, description: e.category || '', route: `/app/catechism?entry=${e.number}` })
  );

  // Directory results: prefer cache, fall back to DB
  const directorySource = cacheReady ? directoryResults : directoryEntriesDb;
  directorySource.forEach((e: any) =>
    results.push({ id: e.id, type: 'directory', module: 'directory', label: `#${e.number} ${e.part || ''}`, description: (e.content || '').substring(0, 100), route: `/app/directory?entry=${e.number}` })
  );

  households.forEach((h: any) =>
    results.push({ id: h.id, type: 'family', module: 'family', label: h.name, description: '', route: `/app/families/${h.id}` })
  );

  sacramentalJourneys.forEach((j: any) =>
    results.push({ id: j.id, type: 'sacrament', module: 'sacrament', label: `${j.catechumenProfile?.firstName} ${j.catechumenProfile?.lastName}`, description: j.template?.sacrament?.name || '', route: `/app/sacramental-journeys` })
  );

  documents.forEach((d: any) =>
    results.push({ id: d.id, type: 'document', module: 'document', label: d.name, description: d.type || '', route: `/app/documents` })
  );

  parishes.forEach((p: any) =>
    results.push({ id: p.id, type: 'parish', module: 'parish', label: p.name, description: '', route: `/app/parishes/${p.id}` })
  );

  communities.forEach((c: any) =>
    results.push({ id: c.id, type: 'community', module: 'community', label: c.name, description: c.type || '', route: `/app/communities` })
  );

  return results;
};
