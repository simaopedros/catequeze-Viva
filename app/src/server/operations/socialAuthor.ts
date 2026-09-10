export function buildAuthorDisplayName(author: {
  firstName?: string | null;
  lastName?: string | null;
  handle?: string | null;
  socialHandle?: string | null;
}): string {
  const name = [author.firstName, author.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  const handle = author.socialHandle || author.handle;
  if (handle) return `@${handle}`;
  return 'Membro da Comunidade';
}
