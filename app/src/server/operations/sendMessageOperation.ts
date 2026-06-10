import { HttpError } from 'wasp/server';
import { validateOrThrow, sendMessageSchema } from '../validation';
import { Resend } from 'resend';
import { isJobWorkerProcess } from '../jobs/jobGuard';

/** Escapa caracteres HTML para prevenir XSS em emails */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const sendMessageEmail = async (args: { to: string; subject: string; body: string }, context: any) => {
  validateOrThrow(sendMessageSchema, args);
  if (!context.user && !isJobWorkerProcess()) throw new HttpError(401);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new HttpError(500, 'Configuração de email não encontrada. Contacte o administrador.');
  }

  const resend = new Resend(apiKey);

  const safeSubject = escapeHtml(args.subject);
  const safeBody = escapeHtml(args.body).replace(/\n/g, '<br>');

  const { data, error } = await resend.emails.send({
    from: 'Catequese Viva <onboarding@resend.dev>',
    to: args.to,
    subject: args.subject,
    html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2>' + safeSubject + '</h2><p>' + safeBody + '</p><hr/><p style="color:#666;font-size:12px">Enviado pela Catequese Viva</p></div>',
  });

  if (error) throw new HttpError(500, 'Falha no envio: ' + error.message);
  return { success: true, id: data?.id };
};
