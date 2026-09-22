import type { CommunityFeedScope } from '../components/communityUi';

/** Onde a publicação aparece no feed (filtros Todos / Paróquia / Turmas). */
export type CommunityPublishAudience = CommunityFeedScope;

export function audienceLabel(audience: CommunityPublishAudience, parishName?: string | null): string {
  switch (audience) {
    case 'all':
      return 'Toda a comunidade';
    case 'parish':
      return parishName ? `Paróquia · ${parishName}` : 'Paróquia';
    case 'classes':
      return 'Turmas e catequese';
    default:
      return 'Toda a comunidade';
  }
}

export function audienceHint(audience: CommunityPublishAudience): string {
  switch (audience) {
    case 'all':
      return 'Visível no feed geral da Comunidade.';
    case 'parish':
      return 'Associada à paróquia activa no app.';
    case 'classes':
      return 'Conversa de turmas e catequese (sem etiqueta paroquial).';
    default:
      return '';
  }
}

export function parishIdForAudience(
  audience: CommunityPublishAudience,
  workspaceId: string | null | undefined,
): string | null {
  return audience === 'parish' && workspaceId ? workspaceId : null;
}
