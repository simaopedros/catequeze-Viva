// ---- Role Labels ----
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  DIOCESE_ADMIN: 'Diocese',
  PARISH_COORDINATOR: 'Coordenador',
  COMMUNITY_COORDINATOR: 'Comunidade',
  LEAD_CATECHIST: 'Catequista Resp.',
  ASSISTANT_CATECHIST: 'Auxiliar',
  GUARDIAN: 'Responsável',
  CATECHUMEN: 'Catequizando',
  CONTENT_REVIEWER: 'Revisor',
  PASTORAL_VIEWER: 'Pastoral',
};

// ---- Membership Status Labels ----
export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativo', color: 'bg-green-100 text-green-700' },
  INVITED: { label: 'Convidado', color: 'bg-yellow-100 text-yellow-700' },
  INACTIVE: { label: 'Inativo', color: 'bg-gray-100 text-gray-600' },
};

// ---- Class Status Map (Badge variant + label) ----
export const CLASS_STATUS_MAP: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  ACTIVE: { variant: 'default', label: 'Ativa' },
  DRAFT: { variant: 'secondary', label: 'Rascunho' },
  PAUSED: { variant: 'outline', label: 'Pausada' },
  CONCLUDED: { variant: 'outline', label: 'Concluída' },
  ARCHIVED: { variant: 'destructive', label: 'Arquivada' },
};

// ---- Class Filter Labels ----
export const CLASS_FILTERS = ['Todas', 'Ativa', 'Pausada', 'Concluída', 'Arquivada'] as const;
export const CLASS_FILTER_STATUS: Record<string, string> = {
  Todas: '',
  Ativa: 'ACTIVE',
  Pausada: 'PAUSED',
  Concluída: 'CONCLUDED',
  Arquivada: 'ARCHIVED',
};

// ---- Community Type Labels ----
export const COMMUNITY_TYPE_LABELS: Record<string, string> = {
  CHAPEL: 'Capela',
  RURAL_COMMUNITY: 'Comunidade Rural',
  URBAN_COMMUNITY: 'Comunidade Urbana',
  MISSION: 'Missão',
};

// ---- Community Type Options (for selects) ----
export const COMMUNITY_TYPE_OPTIONS = [
  { value: '', label: 'Selecionar...' },
  { value: 'CHAPEL', label: 'Capela' },
  { value: 'URBAN_COMMUNITY', label: 'Comunidade Urbana' },
  { value: 'RURAL_COMMUNITY', label: 'Comunidade Rural' },
  { value: 'MISSION', label: 'Missão' },
] as const;
