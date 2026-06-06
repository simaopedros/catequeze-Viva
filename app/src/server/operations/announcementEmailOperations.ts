import { HttpError } from 'wasp/server';
import { Resend } from 'resend';

function escapeHtml(unsafe: string): string {
  return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/**
 * Send an announcement email to all guardians of a class.
 */
export const sendClassAnnouncementByEmail = async (
  args: { classId: string; subject: string; body: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new HttpError(500, 'Email não configurado.');

  // Get all guardians from the class
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
