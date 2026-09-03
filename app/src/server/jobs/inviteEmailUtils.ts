import {
  FAMILY_PORTAL_HOST,
  STAFF_PORTAL_HOST,
  isFamilyPortalRole,
} from '../../shared/portal';
import { EMAIL_MESSAGE } from '../../shared/emailCatalog';
import { enqueueEmail } from '../email/service';

export function inviteLink(token: string, role?: string): string {
  const host =
    role && !isFamilyPortalRole(role) ? STAFF_PORTAL_HOST : FAMILY_PORTAL_HOST;
  return `https://${host}/convite/${token}`;
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    PARISH_COORDINATOR: 'Coordenador(a) Paroquial',
    COMMUNITY_COORDINATOR: 'Coordenador(a) de Comunidade',
    LEAD_CATECHIST: 'Catequista responsável',
    ASSISTANT_CATECHIST: 'Catequista auxiliar',
    GUARDIAN: 'Responsável familiar',
    CATECHUMEN: 'Catequizando',
    CONTENT_REVIEWER: 'Revisor(a) de Conteúdo',
    PASTORAL_VIEWER: 'Liderança Pastoral',
  };
  return map[role] || role;
}

export type InviteEmailPayload = {
  to: string;
  location: string;
  role: string;
  token: string;
};

export type InviteEmailContent = {
  subject: string;
  body: string;
  link: string;
  portal: 'family' | 'staff';
};

/** Pure builder used by deliverInviteEmail and unit tests. */
export function buildInviteEmailContent(
  payload: Pick<InviteEmailPayload, 'location' | 'role' | 'token'>,
): InviteEmailContent {
  const label = roleLabel(payload.role);
  const link = inviteLink(payload.token, payload.role);
  const isFamily = isFamilyPortalRole(payload.role);

  if (isFamily) {
    return {
      portal: 'family',
      link,
      subject: `Convite para o Portal da Família — ${payload.location}`,
      body: [
        `Você foi convidado(a) para o Portal da Família de "${payload.location}" como ${label}.`,
        '',
        'Nesse portal você acompanha a catequese da sua família (encontros, presença e documentos).',
        '',
        `Para aceitar, acesse: ${link}`,
        '',
        'Este convite expira em 30 dias.',
        '',
        '— Equipe Catequese Viva',
      ].join('\n'),
    };
  }

  return {
    portal: 'staff',
    link,
    subject: `Convite para a equipe de catequese — ${payload.location}`,
    body: [
      `Você foi convidado(a) para integrar a equipe de catequese de "${payload.location}" como ${label}.`,
      '',
      'Esse acesso é do painel pastoral (coordenação e catequistas), não do Portal da Família.',
      '',
      `Para aceitar, acesse: ${link}`,
      '',
      'Este convite expira em 30 dias.',
      '',
      '— Equipe Catequese Viva',
    ].join('\n'),
  };
}

export async function deliverInviteEmail(
  payload: InviteEmailPayload,
  context?: any,
): Promise<void> {
  const content = buildInviteEmailContent(payload);
  await enqueueEmail({
    messageId:
      content.portal === 'family'
        ? EMAIL_MESSAGE.INVITE_FAMILY
        : EMAIL_MESSAGE.INVITE_STAFF,
    to: payload.to,
    payload: {
      location: payload.location,
      roleLabel: roleLabel(payload.role),
      link: content.link,
    },
    idempotencyKey: `invite:${payload.token}`,
    context,
  });
}
