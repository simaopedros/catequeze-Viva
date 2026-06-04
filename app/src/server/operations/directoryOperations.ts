import { HttpError } from 'wasp/server';

export const searchDirectory = async (args: { query: string; limit?: number }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.query || args.query.length < 2) return [];

  const q = args.query.trim();
  const limit = args.limit || 20;

  // Try numeric search first
  const num = parseInt(q);
  if (!isNaN(num)) {
    const entry = await context.entities.DirectoryEntry.findUnique({
      where: { number: num },
    });
    if (entry) return [entry];
  }

  return context.entities.DirectoryEntry.findMany({
    where: {
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

export const listDirectoryByPart = async (args: { part: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  return context.entities.DirectoryEntry.findMany({
    where: { part: args.part },
    orderBy: { number: 'asc' },
  });
};

export const getDirectoryEntry = async (args: { number: number }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const entry = await context.entities.DirectoryEntry.findUnique({ where: { number: args.number } });
  if (!entry) throw new HttpError(404, 'Entrada não encontrada.');
  return entry;
};

export const listDirectoryParts = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);
  const entries = await context.entities.DirectoryEntry.findMany({
    select: { part: true, chapter: true, title: true, number: true },
    orderBy: { number: 'asc' },
    distinct: ['chapter'],
  });
  return entries;
};

export const addDirectoryRef = async (args: { contentId: string; entryId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
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
  await context.entities.ContentDirectoryReference.delete({ where: { id: args.id } });
  return { success: true };
};
