import { HttpError } from 'wasp/server';
import { Resend } from 'resend';
import { MembershipStatus } from '@prisma/client';

function escapeHtml(unsafe: string): string {
  return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

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

  if (isCoordinatorOrAbove(membership.role)) return;

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

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new HttpError(500, 'Email não configurado.');

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

  const resend = new Resend(apiKey);
  const safeBody = escapeHtml(args.body).replace(/\n/g, '<br>');

  const results = await Promise.allSettled(
    [...guardianEmails].map((to) =>
      resend.emails.send({
        from: 'Catequese Viva <comunicados@catequeseviva.com.br>',
        to,
        subject: args.subject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#4f46e5">${escapeHtml(args.subject)}</h2>
<div style="line-height:1.6;color:#333;margin:16px 0">${safeBody}</div>
<hr style="border:none;border-top:1px solid #e5e7eb"/>
<p style="color:#6b7280;font-size:12px">Enviado pela Catequese Viva • Gerencie suas notificações em Configurações</p>
</div>`,
      }),
    ),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return { sent, failed, total: guardianEmails.size };
};
