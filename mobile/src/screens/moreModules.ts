import { appRoutes } from '../navigation/routes';

export type MoreModule = {
  id: string;
  label: string;
  hint: string;
  href: string;
  live: boolean;
  hideInPersonal?: boolean;
  roles?: string[];
  guardianOnly?: boolean;
  iconKey: string;
};

export type MoreSection = {
  id: string;
  title: string;
  items: MoreModule[];
};

const ALL_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'GUARDIAN',
  'CATECHUMEN',
  'CONTENT_REVIEWER',
  'PASTORAL_VIEWER',
  'PERSONAL_OWNER',
  'PLATFORM_MEMBER',
];
const STAFF_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
];
const CATECHIST_ROLES = [...STAFF_ROLES, 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'];
const VIEWER_ROLES = [...CATECHIST_ROLES, 'PASTORAL_VIEWER', 'CONTENT_REVIEWER'];
const LEARNER_ROLES = [...VIEWER_ROLES, 'GUARDIAN', 'CATECHUMEN', 'PLATFORM_MEMBER'];

/** Matches `PERSONAL_HIDDEN_ICON_KEYS` in app/src/shared/navigation.ts */
export const PERSONAL_HIDDEN_IDS = new Set([
  'years',
  'reports',
  'parishes',
  'communities',
  'official',
  'announcements',
  'formation',
]);

export const TAB_HIDDEN_IDS = new Set(['dashboard', 'community', 'classes', 'calendar']);
export const OUT_OF_SCOPE_IDS = new Set(['ai', 'admin']);

/** Web NAV_GROUPS mapped to Expo: Operação / Pessoas / Conteúdo / Gestão / Definições. */
export const MORE_SECTIONS: MoreSection[] = [
  {
    id: 'operation',
    title: 'Operação',
    items: [
      {
        id: 'groups',
        label: 'Grupos',
        hint: 'Grupos pastorais',
        href: appRoutes.groups,
        live: true,
        roles: ALL_ROLES,
        iconKey: 'groups',
      },
      {
        id: 'messages',
        label: 'Mensagens',
        hint: 'Conversas da catequese',
        href: appRoutes.messages,
        live: true,
        roles: [...CATECHIST_ROLES, 'GUARDIAN', 'CATECHUMEN'],
        iconKey: 'messages',
      },
      {
        id: 'announcements',
        label: 'Comunicados',
        hint: 'Avisos pastorais',
        href: appRoutes.announcements,
        live: true,
        hideInPersonal: true,
        roles: [...CATECHIST_ROLES, 'PASTORAL_VIEWER'],
        iconKey: 'announcements',
      },
    ],
  },
  {
    id: 'people',
    title: 'Pessoas',
    items: [
      {
        id: 'catechumens',
        label: 'Catequizandos',
        hint: 'Perfis, inscrições e jornadas',
        href: appRoutes.catechumens,
        live: true,
        roles: [...VIEWER_ROLES, 'GUARDIAN'],
        iconKey: 'catechumens',
      },
      {
        id: 'families',
        label: 'Famílias',
        hint: 'Agregados e responsáveis',
        href: appRoutes.families,
        live: true,
        roles: CATECHIST_ROLES,
        iconKey: 'families',
      },
      {
        id: 'team',
        label: 'Pessoas e acessos',
        hint: 'Equipe da paróquia ou espaço',
        href: appRoutes.team,
        live: true,
        roles: CATECHIST_ROLES,
        iconKey: 'team',
      },
      {
        id: 'family-invites',
        label: 'Convites da família',
        hint: 'Convites do portal da família',
        href: appRoutes.familyInvites,
        live: true,
        roles: CATECHIST_ROLES,
        iconKey: 'family_portal_invites',
      },
      {
        id: 'birthdays',
        label: 'Aniversariantes',
        hint: 'Próximos aniversários',
        href: appRoutes.birthdays,
        live: true,
        roles: LEARNER_ROLES,
        iconKey: 'catechumens',
      },
    ],
  },
  {
    id: 'content',
    title: 'Conteúdo',
    items: [
      {
        id: 'library',
        label: 'Biblioteca',
        hint: 'Encontros e materiais da catequese',
        href: appRoutes.content,
        live: true,
        roles: [...CATECHIST_ROLES, 'CONTENT_REVIEWER'],
        iconKey: 'content_library',
      },
      {
        id: 'official',
        label: 'Pasta oficial',
        hint: 'Recursos da diocese e da paróquia',
        href: appRoutes.officialLibrary,
        live: true,
        hideInPersonal: true,
        roles: [...CATECHIST_ROLES, 'CONTENT_REVIEWER'],
        iconKey: 'official_library',
      },
      {
        id: 'bible',
        label: 'Bíblia',
        hint: 'Livros e capítulos',
        href: appRoutes.bible,
        live: true,
        roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'],
        iconKey: 'bible',
      },
      {
        id: 'catechism',
        label: 'Catecismo',
        hint: 'Pesquisa nos números do CIC',
        href: appRoutes.catechism,
        live: true,
        roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'],
        iconKey: 'catechism',
      },
      {
        id: 'directory',
        label: 'Diretório',
        hint: 'Diretório para a Catequese',
        href: appRoutes.directory,
        live: true,
        roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'],
        iconKey: 'directory',
      },
      {
        id: 'sacraments',
        label: 'Sacramentos',
        hint: 'Jornadas sacramentais',
        href: appRoutes.sacraments,
        live: true,
        roles: [...STAFF_ROLES, 'LEAD_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'PASTORAL_VIEWER'],
        iconKey: 'sacraments',
      },
      {
        id: 'journey-templates',
        label: 'Modelos de Jornada',
        hint: 'Modelos sacramentais do espaço',
        href: appRoutes.journeyTemplates,
        live: true,
        roles: [...STAFF_ROLES, 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'],
        iconKey: 'journey_templates',
      },
      {
        id: 'documents',
        label: 'Documentos',
        hint: 'Arquivos da família e da turma',
        href: appRoutes.documents,
        live: true,
        roles: [...CATECHIST_ROLES, 'GUARDIAN'],
        iconKey: 'documents',
      },
    ],
  },
  {
    id: 'management',
    title: 'Gestão',
    items: [
      {
        id: 'parishes',
        label: 'Paróquias',
        hint: 'Espaços ligados à sua conta',
        href: appRoutes.parishes,
        live: true,
        hideInPersonal: true,
        roles: STAFF_ROLES,
        iconKey: 'parishes',
      },
      {
        id: 'communities',
        label: 'Comunidades',
        hint: 'Comunidades da paróquia',
        href: appRoutes.parishCommunities,
        live: true,
        hideInPersonal: true,
        roles: CATECHIST_ROLES,
        iconKey: 'communities',
      },
      {
        id: 'reports',
        label: 'Relatórios',
        hint: 'Presença e visão da paróquia',
        href: appRoutes.reports,
        live: true,
        hideInPersonal: true,
        roles: [...STAFF_ROLES, 'PASTORAL_VIEWER'],
        iconKey: 'reports',
      },
      {
        id: 'years',
        label: 'Anos Catequéticos',
        hint: 'Anos letivos da paróquia',
        href: appRoutes.catecheticalYears,
        live: true,
        hideInPersonal: true,
        roles: STAFF_ROLES,
        iconKey: 'catechetical_years',
      },
      {
        id: 'formation',
        label: 'Formação',
        hint: 'Percursos da equipe',
        href: appRoutes.formation,
        live: true,
        hideInPersonal: true,
        roles: CATECHIST_ROLES,
        iconKey: 'formation',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Definições',
    items: [
      {
        id: 'profile',
        label: 'Perfil',
        hint: 'O seu perfil na Comunidade',
        href: appRoutes.myProfile,
        live: true,
        roles: ALL_ROLES,
        iconKey: 'community',
      },
      {
        id: 'notifications',
        label: 'Notificações',
        hint: 'Avisos da rede e da paróquia',
        href: appRoutes.notifications,
        live: true,
        roles: ALL_ROLES,
        iconKey: 'announcements',
      },
      {
        id: 'blocked',
        label: 'Bloqueados',
        hint: 'Contas que você escondeu',
        href: appRoutes.blocked,
        live: true,
        roles: ALL_ROLES,
        iconKey: 'team',
      },
      {
        id: 'settings',
        label: 'Configurações',
        hint: 'Conta, espaço e sessão',
        href: appRoutes.settings,
        live: true,
        roles: ALL_ROLES,
        iconKey: 'settings',
      },
      {
        id: 'billing',
        label: 'Assinatura',
        hint: 'Plano atual (gestão na web)',
        href: appRoutes.billing,
        live: true,
        roles: [...STAFF_ROLES, 'PLATFORM_MEMBER'],
        iconKey: 'billing',
      },
      {
        id: 'consents',
        label: 'Consentimentos',
        hint: 'Autorizações da família',
        href: appRoutes.consents,
        live: true,
        guardianOnly: true,
        roles: ['GUARDIAN'],
        iconKey: 'consents',
      },
    ],
  },
];

export type MoreNavContext = {
  workspaceType?: string | null;
  role?: string | null;
  isAdmin?: boolean;
  hiddenIds?: string[];
  canAccessCatechesis?: boolean;
};

const CATECHESIS_IDS = new Set([
  'classes',
  'catechumens',
  'families',
  'team',
  'family-invites',
  'library',
  'official',
  'sacraments',
  'journey-templates',
  'documents',
  'parishes',
  'communities',
  'reports',
  'years',
  'formation',
  'announcements',
]);

export function getMoreSections(ctx: MoreNavContext = {}): MoreSection[] {
  const role = ctx.role || '';
  const isAdmin = Boolean(ctx.isAdmin);
  const personal = ctx.workspaceType === 'PERSONAL';
  const hidden = new Set([...(ctx.hiddenIds ?? []), ...TAB_HIDDEN_IDS, ...OUT_OF_SCOPE_IDS]);
  const hideCatechesis = ctx.canAccessCatechesis === false;

  return MORE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (hidden.has(item.id)) return false;
      if (personal && (item.hideInPersonal || PERSONAL_HIDDEN_IDS.has(item.id))) return false;
      if (hideCatechesis && CATECHESIS_IDS.has(item.id)) return false;
      if (item.guardianOnly) return isAdmin || role === 'GUARDIAN';
      if (!item.roles || isAdmin) return true;
      if (!role) return true;
      const effectiveRole = role === 'PERSONAL_OWNER' ? 'PARISH_COORDINATOR' : role;
      return item.roles.includes(effectiveRole) || item.roles.includes(role);
    }),
  })).filter((section) => section.items.length > 0);
}

export const NAV_ICON_TO_IONICON: Record<string, string> = {
  dashboard: 'home-outline',
  groups: 'people-circle-outline',
  community: 'people-outline',
  classes: 'school-outline',
  calendar: 'calendar-outline',
  messages: 'chatbubbles-outline',
  announcements: 'megaphone-outline',
  catechumens: 'person-outline',
  families: 'home-outline',
  team: 'people-outline',
  family_portal_invites: 'mail-outline',
  content_library: 'book-outline',
  official_library: 'folder-outline',
  bible: 'book-outline',
  catechism: 'library-outline',
  directory: 'list-outline',
  sacraments: 'flower-outline',
  journey_templates: 'map-outline',
  documents: 'document-text-outline',
  parishes: 'business-outline',
  communities: 'globe-outline',
  reports: 'stats-chart-outline',
  catechetical_years: 'time-outline',
  formation: 'ribbon-outline',
  settings: 'settings-outline',
  billing: 'card-outline',
  consents: 'checkbox-outline',
};

export function ioniconForKey(iconKey?: string) {
  return NAV_ICON_TO_IONICON[iconKey || ''] || 'ellipse-outline';
}
