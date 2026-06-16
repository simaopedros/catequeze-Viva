import { HttpError, prisma } from 'wasp/server';

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
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: { id: args.targetParishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (!isPersonalOwner) {
      const membership = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, parishId: args.targetParishId, status: 'ACTIVE', role: 'PARISH_COORDINATOR' },
      });
      if (!membership) {
        throw new HttpError(403, 'Apenas o coordenador da paróquia de destino ou um administrador pode executar a migração.');
      }
    }
  }

  // Verify both parishes exist
  const [source, target] = await Promise.all([
    context.entities.Parish.findUnique({ where: { id: args.sourceParishId } }),
    context.entities.Parish.findUnique({ where: { id: args.targetParishId } }),
  ]);
  if (!source) throw new HttpError(404, 'Paróquia de origem não encontrada.');
  if (!target) throw new HttpError(404, 'Paróquia de destino não encontrada.');

  // Run atomic migration in a transaction
  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Migrate classes
    const classesResult = await tx.CatechesisClass.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    // 2. Migrate households
    const householdsResult = await tx.Household.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    // 3. Migrate content items
    await tx.ContentItem.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    // 4. Migrate sacramental journey templates
    await tx.SacramentalJourneyTemplate.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    // 5. Migrate message campaigns
    await tx.MessageCampaign.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    // 6. Migrate liturgical events
    await tx.LiturgicalEvent.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    // 7. Migrate conversations
    await tx.Conversation.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    // 8. Migrate message templates
    await tx.MessageTemplate.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    // 9. Migrate catechetical years
    await tx.CatecheticalYear.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    // 10. Migrate communities
    await tx.Community.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    // 11. Migrate memberships
    let migratedMembers = 0;
    const sourceMembers = await tx.Membership.findMany({
      where: { parishId: args.sourceParishId },
      select: { id: true, userId: true, role: true },
    });

    const rolePriority: Record<string, number> = {
      PARISH_COORDINATOR: 4, COMMUNITY_COORDINATOR: 3, LEAD_CATECHIST: 2,
      ASSISTANT_CATECHIST: 1, GUARDIAN: 0, PASTORAL_VIEWER: 0,
      CONTENT_REVIEWER: 0, CATECHUMEN: 0,
    };

    for (const member of sourceMembers) {
      const existing = await tx.Membership.findFirst({
        where: { userId: member.userId, parishId: args.targetParishId },
      });

      if (existing) {
        if ((rolePriority[member.role] ?? 0) > (rolePriority[existing.role] ?? 0)) {
          await tx.Membership.update({
            where: { id: existing.id },
            data: { role: member.role },
          });
        }
        await tx.Membership.delete({ where: { id: member.id } });
      } else {
        await tx.Membership.update({
          where: { id: member.id },
          data: { parishId: args.targetParishId },
        });
        migratedMembers++;
      }
    }

    // 12. Archive the source parish
    await tx.Parish.update({
      where: { id: args.sourceParishId },
      data: { active: false },
    });

    return {
      classes: classesResult.count,
      households: householdsResult.count,
      members: migratedMembers,
    };
  });

  return {
    success: true,
    migrated: {
      classes: result.classes,
      households: result.households,
      catechumens: 0,
      members: result.members,
    },
  };
};
