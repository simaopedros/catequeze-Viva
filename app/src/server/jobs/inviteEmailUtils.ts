import { FAMILY_PORTAL_HOST } from '../../shared/portal';

export function inviteLink(token: string): string {
  return `https://${FAMILY_PORTAL_HOST}/convite/${token}`;
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    PARISH_COORDINATOR: 'Coordenador(a) Paroquial',
    COMMUNITY_COORDINATOR: 'Coordenador(a) de Comunidade',
    LEAD_CATECHIST: 'Catequista',
    ASSISTANT_CATECHIST: 'Catequista Auxiliar',
    GUARDIAN: 'Responsável',
    CATECHUMEN: 'Catequizando',
    CONTENT_REVIEWER: 'Revisor(a) de Conteúdo',
    PASTORAL_VIEWER: 'Liderança Pastoral',
  };
  return map[role] || role;
}

import { sendMessageEmail } from '../operations/sendMessageOperation';

export type InviteEmailPayload = {
  to: string;
  location: string;
  role: string;
  token: string;
};

export async function deliverInviteEmail(
  payload: InviteEmailPayload,
  context: any,
): Promise<void> {
  const label = roleLabel(payload.role);
  await sendMessageEmail(
    {
      to: payload.to,
      subject: `Convite para ${payload.location} — Catequese Viva`,
      body: [
        `Você foi convidado(a) para participar de "${payload.location}" como ${label}.`,
        '',
        `Para aceitar, acesse: ${inviteLink(payload.token)}`,
        '',
        'Este convite expira em 30 dias.',
        '',
        '— Equipa Catequese Viva',
      ].join('\n'),
    },
    context,
  );
}
