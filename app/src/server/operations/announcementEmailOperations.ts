import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';
import { resolveWorkspaceAccess, isClassInScope } from './sharedScope';
import { EMAIL_MESSAGE } from '../../shared/emailCatalog';
import { enqueueEmail } from '../email/service';

function isCoordinatorOrAbove(role: string): boolean {
  return ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(role);
}

/** Verifica se o usuário tem permissão para enviar comunicados para esta turma */
async function assertCanAnnounceToClass(context: any, classId: string): Promise<void> {
  if (context.user?.isAdmin) return;

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: classId },
    select: { parishId: true, catechists: { select: { userId: true } } },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId: classData.parishId, status: MembershipStatus.ACTIVE },
  });

  if (!membership) {
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: { id: classData.parishId, ownerId: context.user.id, type: 'PERSONAL' },
    });
    if (isPersonalOwner) return;
    throw new HttpError(403, 'Você não pertence à paróquia desta turma.');
  }

  if (isCoordinatorOrAbove(membership.role)) {
    // Scoped community coordinator (vice): only classes inside their scope
    const access = await resolveWorkspaceAccess(context, classData.parishId, {
      required: false,
    });
    if (!access?.isScopedCoordinator || isClassInScope(access, classId)) return;
  }

  const isClassCatechist = classData.catechists.some((cc: any) => cc.userId === context.user.id);
  if (!isClassCatechist) throw new HttpError(403, 'Você não é catequista desta turma.');
}

/**
 * Send an announcement email to all guardians of a class.
 * Requires: user must be a catechist of the class or coordinator of the class's parish.
 */
export const sendClassAnnouncementByEmail = async (
  args: { classId: string; subject: string; body: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  await assertCanAnnounceToClass(context, args.classId);

  const enrollments = await context.entities.ClassEnrollment.findMany({
    where: { classId: args.classId, status: 'ENROLLED' },
    include: {
      catechumenProfile: {
        include: {
          household: {
            include: { guardians: { include: { user: { select: { email: true } } } } },
          },
        },
      },
    },
  });

  const guardianEmails = new Set<string>();
  for (const e of enrollments) {
    for (const g of e.catechumenProfile?.household?.guardians || []) {
      if (g.user?.email) guardianEmails.add(g.user.email);
    }
  }

  if (guardianEmails.size === 0) {
    throw new HttpError(400, 'Nenhum responsável com email encontrado nesta turma.');
  }

  const recipients = [...guardianEmails];
  let sent = 0;
  let failed = 0;
  const batchId = `${args.classId}:${Date.now()}`;
  for (const to of recipients) {
    try {
      const result = await enqueueEmail({
        messageId: EMAIL_MESSAGE.PASTORAL_ANNOUNCEMENT,
        to,
        payload: {
          subject: args.subject,
          heading: args.subject,
          body: args.body,
        },
        idempotencyKey: `pastoral.announcement:${batchId}:${to}`,
        context,
      });
      if (result.skipped) failed += 1;
      else sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed, total: recipients.length };
};
