import { HttpError } from 'wasp/server';

/**
 * Transfers all data from a source parish (e.g. an independent catechist's
 * duplicate) into a target parish (official), then archives the source.
 *
 * Only SUPER_ADMIN, DIOCESE_ADMIN, or PARISH_COORDINATOR of the *target*
 * parish can execute this.
 */
export const executeParishMigration = async (
  args: { sourceParishId: string; targetParishId: string },
  context: any
): Promise<{ success: boolean; migrated: { classes: number; households: number; catechumens: number; members: number } }> => {
  if (!context.user) throw new HttpError(401);

  if (args.sourceParishId === args.targetParishId) {
    throw new HttpError(400, 'As paróquias de origem e destino devem ser diferentes.');
  }

  // Authorization: must be admin OR coordinator of the target parish
  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: {
        userId: context.user.id,
        parishId: args.targetParishId,
        status: 'ACTIVE',
        role: 'PARISH_COORDINATOR',
      },
    });
    if (!membership) {
      throw new HttpError(403, 'Apenas o coordenador da paróquia de destino ou um administrador pode executar a migração.');
    }
  }

  // Verify both parishes exist
  const [source, target] = await Promise.all([
    context.entities.Parish.findUnique({ where: { id: args.sourceParishId } }),
    context.entities.Parish.findUnique({ where: { id: args.targetParishId } }),
  ]);

  if (!source) throw new HttpError(404, 'Paróquia de origem não encontrada.');
  if (!target) throw new HttpError(404, 'Paróquia de destino não encontrada.');

  let migratedClasses = 0;
  let migratedHouseholds = 0;
  let migratedCatechumens = 0;
  let migratedMembers = 0;

  // Run all updates in a transaction-like sequence
  // (Prisma on Wasp does not support interactive transactions, so we chain sequentially)

  // 1. Migrate classes
  const classesResult = await context.entities.CatechesisClass.updateMany({
    where: { parishId: args.sourceParishId },
    data: { parishId: args.targetParishId },
  });
  migratedClasses = classesResult.count;

  // 2. Migrate households
  const householdsResult = await context.entities.Household.updateMany({
    where: { parishId: args.sourceParishId },
    data: { parishId: args.targetParishId },
  });
  migratedHouseholds = householdsResult.count;

  // 3. Migrate catechumens (those directly linked via household's old parish are handled above;
  //    also handle any orphaned by checking household.parishId)
  //    Most catechumens are linked via household, so their parish context follows the household migration.
  //    No direct parishId on CatechumenProfile, so nothing extra needed.

  // 4. Migrate memberships: reassign members from source → target (avoid duplicates)
  const sourceMembers = await context.entities.Membership.findMany({
    where: { parishId: args.sourceParishId },
    select: { id: true, userId: true, role: true },
  });

  for (const member of sourceMembers) {
    // Check if user already has a membership in the target parish
    const existing = await context.entities.Membership.findFirst({
      where: { userId: member.userId, parishId: args.targetParishId },
    });

    if (existing) {
      // Keep the higher role (coordinator > lead > assistant > guardian)
      const rolePriority: Record<string, number> = {
        PARISH_COORDINATOR: 4,
        COMMUNITY_COORDINATOR: 3,
        LEAD_CATECHIST: 2,
        ASSISTANT_CATECHIST: 1,
        GUARDIAN: 0,
        PASTORAL_VIEWER: 0,
        CONTENT_REVIEWER: 0,
        CATECHUMEN: 0,
      };
      const existingPriority = rolePriority[existing.role] ?? 0;
      const sourcePriority = rolePriority[member.role] ?? 0;

      if (sourcePriority > existingPriority) {
        await context.entities.Membership.update({
          where: { id: existing.id },
          data: { role: member.role },
        });
      }
      // Remove old membership
      await context.entities.Membership.delete({ where: { id: member.id } });
    } else {
      await context.entities.Membership.update({
        where: { id: member.id },
        data: { parishId: args.targetParishId },
      });
      migratedMembers++;
    }
  }

  // 5. Migrate content items created in the source parish
  await context.entities.ContentItem.updateMany({
    where: { parishId: args.sourceParishId },
    data: { parishId: args.targetParishId },
  });

  // 6. Migrate sacramental journey templates
  await context.entities.SacramentalJourneyTemplate.updateMany({
    where: { parishId: args.sourceParishId },
    data: { parishId: args.targetParishId },
  });

  // 7. Migrate message campaigns
  await context.entities.MessageCampaign.updateMany({
    where: { parishId: args.sourceParishId },
    data: { parishId: args.targetParishId },
  });

  // 8. Migrate liturgical events
  await context.entities.LiturgicalEvent.updateMany({
    where: { parishId: args.sourceParishId },
    data: { parishId: args.targetParishId },
  });

  // 9. Migrate conversations
  await context.entities.Conversation.updateMany({
    where: { parishId: args.sourceParishId },
    data: { parishId: args.targetParishId },
  });

  // 10. Migrate message templates
  await context.entities.MessageTemplate.updateMany({
    where: { parishId: args.sourceParishId },
    data: { parishId: args.targetParishId },
  });

  // 11. Migrate catechetical years
  await context.entities.CatecheticalYear.updateMany({
    where: { parishId: args.sourceParishId },
    data: { parishId: args.targetParishId },
  });

  // 12. Migrate communities
  await context.entities.Community.updateMany({
    where: { parishId: args.sourceParishId },
    data: { parishId: args.targetParishId },
  });

  // 13. Archive the source parish
  await context.entities.Parish.update({
    where: { id: args.sourceParishId },
    data: { active: false },
  });

  return {
    success: true,
    migrated: {
      classes: migratedClasses,
      households: migratedHouseholds,
      catechumens: migratedCatechumens,
      members: migratedMembers,
    },
  };
};
