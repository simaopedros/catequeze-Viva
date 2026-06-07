/** Shared helper for RLS — resolves active parish IDs for a user, including personal workspace. */
export async function getUserParishIds(context: any, userId: string): Promise<string[]> {
  if (!userId) return [];

  const ids: string[] = [];

  // Include personal workspace
  const personal = await context.entities.Parish?.findFirst({
    where: { ownerId: userId, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal) ids.push(personal.id);

  const memberships = await context.entities.Membership?.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { parishId: true },
  });

  for (const m of (memberships || [])) {
    if (!ids.includes(m.parishId)) ids.push(m.parishId);
  }

  return ids;
}
