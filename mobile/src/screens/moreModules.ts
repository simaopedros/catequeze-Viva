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
  icon?: string;
};

export type MoreSection = {
  id: string;
  title: string;
  items: MoreModule[];
};

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
];
const CATECHIST_ROLES = [...STAFF_ROLES, 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'];
const VIEWER_ROLES = [...CATECHIST_ROLES, 'PASTORAL_VIEWER', 'CONTENT_REVIEWER'];

export const PERSONAL_HIDDEN_IDS = new Set([
  'years',
  'reports',
  'parishes',
  'communities',
  'official',
  'announcements',
  'formation',
]);

/** Church Center-style groups: Pastoral, Conteúdo, Conta. */
export const MORE_SECTIONS: MoreSection[] = [
  {
    id: 'pastoral',
    title: 'Pastoral',
    items: [
      {
        id: 'groups',
        label: 'Grupos',
        hint: 'Grupos pastorais',
        href: appRoutes.groups,
        live: true,
        icon: 'G',
      },
      {
        id: 'messages',
        label: 'Mensagens',
        hint: 'Conversas da catequese',
        href: appRoutes.messages,
        live: true,
        icon: 'M',
      },
      {
        id: 'announcements',
        label: 'Comunicados',
        hint: 'Avisos pastorais',
        href: appRoutes.announcements,
        live: true,
        hideInPersonal: true,
        roles: [...CATECHIST_ROLES, 'PASTORAL_VIEWER'],
        icon: 'C',
      },
      {
        id: 'catechumens',
        label: 'Catequizandos',
        hint: 'Perfis, inscrições e jornadas',
        href: appRoutes.catechumens,
        live: true,
        roles: [...VIEWER_ROLES, 'GUARDIAN'],
        icon: 'K',
      },
      {
        id: 'families',
        label: 'Famílias',
        hint: 'Agregados e responsáveis',
        href: appRoutes.families,
        live: true,
        roles: CATECHIST_ROLES,
        icon: 'F',
      },
      {
        id: 'team',
        label: 'Pessoas e acessos',
        hint: 'Equipe da paróquia ou espaço',
        href: appRoutes.team,
        live: true,
        roles: CATECHIST_ROLES,
        icon: 'P',
      },
      {
        id: 'family-invites',
        label: 'Convites da família',
        hint: 'Convites do portal da família',
        href: appRoutes.familyInvites,
        live: true,
        roles: CATECHIST_ROLES,
        icon: 'I',
      },
      {
        id: 'birthdays',
        label: 'Aniversariantes',
        hint: 'Próximos aniversários',
        href: appRoutes.birthdays,
        live: true,
        icon: 'A',
      },
      {
        id: 'parishes',
        label: 'Paróquias',
        hint: 'Espaços ligados à sua conta',
        href: appRoutes.parishes,
        live: true,
        hideInPersonal: true,
        roles: STAFF_ROLES,
        icon: 'O',
      },
      {
        id: 'communities',
        label: 'Comunidades',
        hint: 'Comunidades da paróquia',
        href: appRoutes.parishCommunities,
        live: true,
        hideInPersonal: true,
        roles: CATECHIST_ROLES,
        icon: 'U',
      },
      {
        id: 'reports',
        label: 'Relatórios',
        hint: 'Presença e visão da paróquia',
        href: appRoutes.reports,
        live: true,
        hideInPersonal: true,
        roles: [...STAFF_ROLES, 'PASTORAL_VIEWER'],
        icon: 'R',
      },
      {
        id: 'years',
        label: 'Anos catequéticos',
        hint: 'Anos letivos da paróquia',
        href: appRoutes.catecheticalYears,
        live: true,
        hideInPersonal: true,
        roles: STAFF_ROLES,
        icon: 'Y',
      },
      {
        id: 'formation',
        label: 'Formação',
        hint: 'Percursos da equipe',
        href: appRoutes.formation,
        live: true,
        hideInPersonal: true,
        roles: CATECHIST_ROLES,
        icon: 'N',
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
        icon: 'B',
      },
      {
        id: 'official',
        label: 'Pasta oficial',
        hint: 'Recursos da diocese e da paróquia',
        href: appRoutes.officialLibrary,
        live: true,
        hideInPersonal: true,
        roles: [...CATECHIST_ROLES, 'CONTENT_REVIEWER'],
        icon: 'D',
      },
      {
        id: 'bible',
        label: 'Bíblia',
        hint: 'Livros e capítulos',
        href: appRoutes.bible,
        live: true,
        icon: '✝',
      },
      {
        id: 'catechism',
        label: 'Catecismo',
        hint: 'Pesquisa nos números do CIC',
        href: appRoutes.catechism,
        live: true,
        icon: 'C',
      },
      {
        id: 'directory',
        label: 'Diretório',
        hint: 'Diretório para a Catequese',
        href: appRoutes.directory,
        live: true,
        icon: 'T',
      },
      {
        id: 'sacraments',
        label: 'Sacramentos',
        hint: 'Jornadas sacramentais',
        href: appRoutes.sacraments,
        live: true,
        icon: 'S',
      },
      {
        id: 'journey-templates',
        label: 'Modelos de jornada',
        hint: 'Modelos sacramentais do espaço',
        href: appRoutes.journeyTemplates,
        live: true,
        roles: [...STAFF_ROLES, 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'],
        icon: 'J',
      },
      {
        id: 'documents',
        label: 'Documentos',
        hint: 'Arquivos da família e da turma',
        href: appRoutes.documents,
        live: true,
        roles: [...CATECHIST_ROLES, 'GUARDIAN'],
        icon: 'L',
      },
    ],
  },
  {
    id: 'account',
    title: 'Conta',
    items: [
      {
        id: 'settings',
        label: 'Configurações',
        hint: 'Conta, espaço e sessão',
        href: appRoutes.settings,
        live: true,
        icon: '⚙',
      },
      {
        id: 'billing',
        label: 'Assinatura',
        hint: 'Plano atual (gestão na web)',
        href: appRoutes.billing,
        live: true,
        roles: [...STAFF_ROLES, 'PLATFORM_MEMBER'],
        icon: '$',
      },
      {
        id: 'consents',
        label: 'Consentimentos',
        hint: 'Autorizações da família',
        href: appRoutes.consents,
        live: true,
        guardianOnly: true,
        icon: '✓',
      },
    ],
  },
];

export type MoreNavContext = {
  workspaceType?: string | null;
  role?: string | null;
  isAdmin?: boolean;
  hiddenIds?: string[];
};

export function getMoreSections(ctx: MoreNavContext = {}): MoreSection[] {
  const role = ctx.role || '';
  const isAdmin = Boolean(ctx.isAdmin);
  const personal = ctx.workspaceType === 'PERSONAL';
  const hidden = new Set(ctx.hiddenIds ?? []);

  return MORE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (hidden.has(item.id)) return false;
      if (personal && (item.hideInPersonal || PERSONAL_HIDDEN_IDS.has(item.id))) {
        return false;
      }
      if (item.guardianOnly) {
        return isAdmin || role === 'GUARDIAN';
      }
      if (!item.roles || isAdmin) return true;
      if (!role) return true;
      const effectiveRole = role === 'PERSONAL_OWNER' ? 'PARISH_COORDINATOR' : role;
      return item.roles.includes(effectiveRole) || item.roles.includes(role);
    }),
  })).filter((section) => section.items.length > 0);
}
