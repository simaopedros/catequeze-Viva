/** Pure helpers for Comunidade block lists — unit-tested without Prisma. */

export function collectHiddenAuthorIds(args: {
  viewerId: string;
  blocks: { blockerId: string; blockedId: string }[];
}): string[] {
  const hidden = new Set<string>();
  for (const block of args.blocks) {
    if (block.blockerId === args.viewerId) hidden.add(block.blockedId);
    if (block.blockedId === args.viewerId) hidden.add(block.blockerId);
  }
  hidden.delete(args.viewerId);
  return [...hidden];
}

export function shouldExcludeAuthorFromFeed(args: {
  viewerId: string | null | undefined;
  authorId: string;
  blockedIds: string[];
}): boolean {
  if (!args.viewerId || args.authorId === args.viewerId) return false;
  return args.blockedIds.includes(args.authorId);
}
