// Technical status/role keys — use useRoleLabels(), useClassStatusMap(), etc. for translated labels.

export const ROLE_KEYS = [
  'SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN',
  'CONTENT_REVIEWER', 'PASTORAL_VIEWER', 'PERSONAL_OWNER', 'PLATFORM_MEMBER',
] as const;

export const CLASS_STATUS_KEYS = ['ACTIVE', 'DRAFT', 'PAUSED', 'CONCLUDED', 'ARCHIVED'] as const;

export const CLASS_FILTER_STATUS: Record<string, string> = {
  '': '',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CONCLUDED: 'CONCLUDED',
  ARCHIVED: 'ARCHIVED',
};

export const COMMUNITY_TYPE_KEYS = ['CHAPEL', 'RURAL_COMMUNITY', 'URBAN_COMMUNITY', 'MISSION'] as const;

// UI labels live in src/i18n/useLabels.ts (useRoleLabels, useClassStatusMap, ...).
