import { HttpError, prisma } from 'wasp/server';
import { logAudit } from '../audit';
import { requirePlatformAdmin } from '../auth/helpers';

/**
 * Parish migration — platform administrators only.
 * Requires explicit confirmation of source and destination IDs.
 * Atomic transaction + full audit trail. Does not grant non-admins
 * the ability to capture a foreign parish.
 */
export const executeParishMigration = async (
  args: {
    sourceParishId: string;
    targetParishId: string;
    /** Must equal sourceParishId — explicit confirmation of origin. */
    confirmSourceParishId: string;
    /** Must equal targetParishId — explicit confirmation of destination. */
    confirmTargetParishId: string;
    /** Must be the literal CONFIRM_MIGRATE */
    confirmation: string;
  },
  context: any,
): Promise<{
  success: boolean;
  migrated: {
    classes: number;
    households: number;
    catechumens: number;
    members: number;
  };
}> => {
  if (!context.user) throw new HttpError(401);
  requirePlatformAdmin(context.user);

  if (!args.sourceParishId || !args.targetParishId) {
    throw new HttpError(400, 'Origem e destino são obrigatórios.');
  }
  if (args.sourceParishId === args.targetParishId) {
    throw new HttpError(
      400,
      'As paróquias de origem e destino devem ser diferentes.',
    );
  }
  if (args.confirmSourceParishId !== args.sourceParishId) {
    throw new HttpError(
      400,
      'Confirmação de origem inválida. confira confirmSourceParishId.',
    );
  }
  if (args.confirmTargetParishId !== args.targetParishId) {
    throw new HttpError(
      400,
      'Confirmação de destino inválida. confira confirmTargetParishId.',
    );
  }
  if (args.confirmation !== 'CONFIRM_MIGRATE') {
    throw new HttpError(
      400,
      'Confirmação inválida. Envie confirmation: "CONFIRM_MIGRATE".',
    );
  }

  const [source, target] = await Promise.all([
    context.entities.Parish.findUnique({
      where: { id: args.sourceParishId },
      select: { id: true, name: true, active: true },
    }),
    context.entities.Parish.findUnique({
      where: { id: args.targetParishId },
      select: { id: true, name: true, active: true },
    }),
  ]);
  if (!source) throw new HttpError(404, 'Paróquia de origem não encontrada.');
  if (!target) throw new HttpError(404, 'Paróquia de destino não encontrada.');

  const result = await prisma.$transaction(async (tx: any) => {
    const classesResult = await tx.CatechesisClass.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    const householdsResult = await tx.Household.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    await tx.ContentItem.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    await tx.SacramentalJourneyTemplate.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    await tx.MessageCampaign.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    await tx.LiturgicalEvent.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    await tx.Conversation.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    await tx.MessageTemplate.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    await tx.CatecheticalYear.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    await tx.Community.updateMany({
      where: { parishId: args.sourceParishId },
      data: { parishId: args.targetParishId },
    });

    let migratedMembers = 0;
    const sourceMembers = await tx.Membership.findMany({
      where: { parishId: args.sourceParishId },
      select: { id: true, userId: true, role: true },
    });

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

    for (const member of sourceMembers) {
      const existing = await tx.Membership.findFirst({
        where: { userId: member.userId, parishId: args.targetParishId },
      });

      if (existing) {
        if (
          (rolePriority[member.role] ?? 0) > (rolePriority[existing.role] ?? 0)
        ) {
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

  await logAudit(context.entities, {
    action: 'UPDATE',
    entityType: 'ParishMigration',
    entityId: args.sourceParishId,
    userId: context.user.id,
    parishId: args.targetParishId,
    metadata: {
      operation: 'PARISH_MIGRATE',
      sourceParishId: args.sourceParishId,
      targetParishId: args.targetParishId,
      sourceName: source.name,
      targetName: target.name,
      migrated: result,
    },
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
