export function asItems<T = any>(payload: unknown, extraKeys: string[] = []): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  const keys = [
    'items',
    'classes',
    'meetings',
    'documents',
    'notifications',
    'tracks',
    'journeys',
    'events',
    'resources',
    'groups',
    'members',
    'households',
    'catechumens',
    'years',
    'parishes',
    'invites',
    'templates',
    'consents',
    ...extraKeys,
  ];
  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  return [];
}

export function pickItems<T = any>(payload: unknown, key: string): T[] {
  if (!payload || typeof payload !== 'object') return [];
  const value = (payload as Record<string, unknown>)[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

export function personName(row: any, fallback = '—'): string {
  if (!row) return fallback;
  if (typeof row.displayName === 'string' && row.displayName.trim()) return row.displayName;
  if (typeof row.name === 'string' && row.name.trim()) return row.name;
  if (typeof row.title === 'string' && row.title.trim()) return row.title;
  const joined = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  if (joined) return joined;
  if (typeof row.email === 'string' && row.email) return row.email;
  return fallback;
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function statusLabel(status?: string | null): string {
  if (!status) return '';
  const map: Record<string, string> = {
    DRAFT: 'Rascunho',
    ACTIVE: 'Ativa',
    PAUSED: 'Pausada',
    CONCLUDED: 'Concluída',
    ARCHIVED: 'Arquivada',
    PUBLISHED: 'Publicado',
    APPROVED: 'Aprovado',
    IN_REVIEW: 'Em revisão',
    ENROLLED: 'Inscrito',
    PRESENT: 'Presente',
    ABSENT: 'Ausente',
    LATE: 'Atrasado',
    JUSTIFIED: 'Justificado',
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em curso',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    NOT_STARTED: 'Por começar',
    WAITING_APPROVAL: 'À espera de aprovação',
    REJECTED: 'Rejeitado',
    INITIAL: 'Inicial',
    PERMANENT: 'Permanente',
    INSTITUTED_MINISTRY: 'Ministério instituído',
    COORDINATION: 'Coordenação',
    INCLUSIVE: 'Inclusiva',
    PARISH: 'Paróquia',
    PERSONAL: 'Pessoal',
    DIOCESE: 'Diocese',
    COMMUNITY: 'Comunidade',
  };
  return map[status] || status;
}

export function workspaceTypeLabel(type?: string | null): string {
  return statusLabel(type);
}
