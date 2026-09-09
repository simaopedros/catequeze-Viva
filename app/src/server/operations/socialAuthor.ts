export function buildAuthorDisplayName(author: {
  firstName?: string | null;
  lastName?: string | null;
  handle?: string | null;
}): string {
  const name = [author.firstName, author.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (author.handle) return `@${author.handle}`;
  return 'Membro da Comunidade';
}
