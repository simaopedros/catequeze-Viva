import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';

const MIN_CHARS = 2;
const MAX_RESULTS_PER_CATEGORY = 3;

async function getParishIds(context: any): Promise<string[]> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { parishId: true },
  });
  return memberships.map((m: any) => m.parishId);
}

async function safeQuery<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

export const globalSearch = async (args: { query: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.query || args.query.trim().length < MIN_CHARS) return [];

  const q = args.query.trim();
  const limit = MAX_RESULTS_PER_CATEGORY;

  const isAdmin = context.user.isAdmin;
  const parishIds = isAdmin ? [] : await getParishIds(context);
  if (!isAdmin && parishIds.length === 0) return [];

  const parishFilter = isAdmin ? {} : { parishId: { in: parishIds } };

  const [
    catechumens,
    classes,
    contentItems,
    bibleVerses,
    catechismEntries,
    directoryEntries,
    households,
    sacramentalJourneys,
    documents,
    parishes,
    communities,
  ] = await Promise.all([
    safeQuery(() =>
      context.entities.CatechumenProfile.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
          ...(isAdmin ? {} : {
            OR: [
              { enrollments: { some: { class: parishFilter } } },
              { household: parishFilter },
            ],
          }),
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

    safeQuery(() =>
      context.entities.BibleVerse.findMany({
        where: { text: { contains: q, mode: 'insensitive' } },
        select: {
          id: true, text: true, number: true,
          chapter: { select: { number: true, book: { select: { name: true, abbreviation: true } } } },
        },
        take: limit,
      })
    ),

    safeQuery(() =>
      context.entities.CatechismEntry.findMany({
        where: {
          OR: [
            { question: { contains: q, mode: 'insensitive' } },
            { answer: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, number: true, question: true, category: true },
        take: limit,
      })
    ),

    safeQuery(() =>
      context.entities.DirectoryEntry.findMany({
        where: { content: { contains: q, mode: 'insensitive' } },
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
    results.push({ id: c.id, type: 'catechumen', module: 'Catequizandos', label: `${c.firstName} ${c.lastName}`, description: 'Catequizando', route: `/app/catechumens/${c.id}` })
  );

  classes.forEach((c: any) =>
    results.push({ id: c.id, type: 'class', module: 'Turmas', label: c.name, description: c.parish?.name ? `Turma · ${c.parish.name}` : 'Turma', route: `/app/classes/${c.id}` })
  );

  contentItems.forEach((ci: any) =>
    results.push({ id: ci.id, type: 'content', module: 'Biblioteca', label: ci.title, description: ci.theme || 'Conteúdo pastoral', route: `/app/content-library/${ci.id}` })
  );

  bibleVerses.forEach((v: any) => {
    const ref = `${v.chapter?.book?.abbreviation || v.chapter?.book?.name} ${v.chapter?.number}:${v.number}`;
    results.push({ id: v.id, type: 'bible', module: 'Bíblia', label: ref, description: (v.text || '').substring(0, 100), route: `/app/bible?ref=${encodeURIComponent(ref)}` });
  });

  catechismEntries.forEach((e: any) =>
    results.push({ id: e.id, type: 'catechism', module: 'Catecismo', label: `#${e.number} ${(e.question || '').substring(0, 80)}`, description: e.category || 'Catecismo', route: `/app/catechism?entry=${e.number}` })
  );

  directoryEntries.forEach((e: any) =>
    results.push({ id: e.id, type: 'directory', module: 'Diretório', label: `#${e.number} ${e.part || ''}`, description: (e.content || '').substring(0, 100), route: `/app/directory?entry=${e.number}` })
  );

  households.forEach((h: any) =>
    results.push({ id: h.id, type: 'family', module: 'Famílias', label: h.name, description: 'Família', route: `/app/families/${h.id}` })
  );

  sacramentalJourneys.forEach((j: any) =>
    results.push({ id: j.id, type: 'sacrament', module: 'Sacramentos', label: `${j.catechumenProfile?.firstName} ${j.catechumenProfile?.lastName}`, description: `Jornada · ${j.template?.sacrament?.name || 'Sacramento'}`, route: `/app/sacramental-journeys` })
  );

  documents.forEach((d: any) =>
    results.push({ id: d.id, type: 'document', module: 'Documentos', label: d.name, description: d.type || 'Documento', route: `/app/documents` })
  );

  parishes.forEach((p: any) =>
    results.push({ id: p.id, type: 'parish', module: 'Paróquias', label: p.name, description: 'Paróquia', route: `/app/parishes/${p.id}` })
  );

  communities.forEach((c: any) =>
    results.push({ id: c.id, type: 'community', module: 'Comunidades', label: c.name, description: c.type || 'Comunidade', route: `/app/communities` })
  );

  return results;
};
