export type NavGroupId =
  | 'operation'
  | 'social'
  | 'people'
  | 'content'
  | 'management'
  | 'settings';

export interface NavItemConfig {
  to: string;
  labelKey: string;
  roles: string[];
  iconKey: string;
  groupId: NavGroupId;
}

export interface VisibleNavGroup {
  id: NavGroupId;
  labelKey: string;
  collapsible: boolean;
  items: NavItemConfig[];
}

export type WorkspaceNavContext = {
  role: string;
  isAdmin: boolean;
  workspaceType?: string | null;
};

export type VisibleNavigation = {
  bottomBar: NavItemConfig[];
  sheetItems: NavItemConfig[];
  groups: VisibleNavGroup[];
  sheetGroups: VisibleNavGroup[];
  all: NavItemConfig[];
};

export const AI_FEATURES_ENABLED = false;
export const SOCIAL_FEATURES_ENABLED = true;

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
const CATECHIST_ROLES = [...STAFF_ROLES, 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'PERSONAL_OWNER'];
const VIEWER_ROLES = [...CATECHIST_ROLES, 'PASTORAL_VIEWER', 'CONTENT_REVIEWER'];
const LEARNER_ROLES = [...VIEWER_ROLES, 'GUARDIAN', 'CATECHUMEN', 'PLATFORM_MEMBER'];
const COORDINATOR_ROLES = new Set([
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
]);
const CATECHIST_ONLY_ROLES = new Set(['LEAD_CATECHIST', 'ASSISTANT_CATECHIST']);

export const PERSONAL_HIDDEN_ICON_KEYS = new Set([
  'catechetical_years',
  'reports',
  'parishes',
  'communities',
  'official_library',
  'announcements',
  'formation',
]);

export const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
  operation: 'Operação',
  social: 'Comunidade',
  people: 'Pessoas',
  content: 'Conteúdo',
  management: 'Gestão',
  settings: 'Configurações',
};

export const NAV_ITEM_LABELS: Record<string, string> = {
  dashboard: 'Início',
  classes: 'Turmas',
  calendar: 'Agenda',
  messages: 'Mensagens',
  announcements: 'Comunicados',
  groups: 'Grupos',
  community: 'Comunidade',
  catechumens: 'Catequizandos',
  families: 'Famílias',
  team: 'Equipa',
  family_portal_invites: 'Convites da família',
  content_library: 'Biblioteca',
  official_library: 'Pasta oficial',
  ai_hub: 'Assistência editorial',
  bible: 'Bíblia',
  catechism: 'Catecismo',
  directory: 'Diretório',
  sacraments: 'Sacramentos',
  journey_templates: 'Modelos de jornada',
  documents: 'Documentos',
  parishes: 'Paróquias',
  communities: 'Comunidades',
  reports: 'Relatórios',
  catechetical_years: 'Anos catequéticos',
  formation: 'Formação',
  settings: 'Configurações',
  billing: 'Assinatura',
  consents: 'Consentimentos',
  admin: 'Administração',
};

function item(partial: NavItemConfig): NavItemConfig {
  return partial;
}

export const NAV_GROUPS: { id: NavGroupId; labelKey: string; collapsible: boolean; items: NavItemConfig[] }[] = [
  {
    id: 'operation',
    labelKey: 'operation',
    collapsible: false,
    items: [
      item({ to: '/app', labelKey: 'dashboard', iconKey: 'dashboard', roles: LEARNER_ROLES, groupId: 'operation' }),
      item({ to: '/app/classes', labelKey: 'classes', iconKey: 'classes', roles: VIEWER_ROLES, groupId: 'operation' }),
      item({ to: '/app/calendar', labelKey: 'calendar', iconKey: 'calendar', roles: LEARNER_ROLES, groupId: 'operation' }),
      item({
        to: '/app/messages',
        labelKey: 'messages',
        iconKey: 'messages',
        roles: [...CATECHIST_ROLES, 'GUARDIAN', 'CATECHUMEN'],
        groupId: 'operation',
      }),
      item({
        to: '/app/announcements',
        labelKey: 'announcements',
        iconKey: 'announcements',
        roles: [...CATECHIST_ROLES, 'PASTORAL_VIEWER'],
        groupId: 'operation',
      }),
    ],
  },
  {
    id: 'social',
    labelKey: 'social',
    collapsible: false,
    items: [
      item({ to: '/app/grupos', labelKey: 'groups', iconKey: 'groups', roles: ALL_ROLES, groupId: 'social' }),
      item({ to: '/app/comunidade', labelKey: 'community', iconKey: 'community', roles: ALL_ROLES, groupId: 'social' }),
    ],
  },
  {
    id: 'people',
    labelKey: 'people',
    collapsible: true,
    items: [
      item({
        to: '/app/catechumens',
        labelKey: 'catechumens',
        iconKey: 'catechumens',
        roles: [...VIEWER_ROLES, 'GUARDIAN'],
        groupId: 'people',
      }),
      item({ to: '/app/families', labelKey: 'families', iconKey: 'families', roles: CATECHIST_ROLES, groupId: 'people' }),
      item({ to: '/app/team', labelKey: 'team', iconKey: 'team', roles: CATECHIST_ROLES, groupId: 'people' }),
      item({
        to: '/app/family-invites',
        labelKey: 'family_portal_invites',
        iconKey: 'family_portal_invites',
        roles: CATECHIST_ROLES,
        groupId: 'people',
      }),
    ],
  },
  {
    id: 'content',
    labelKey: 'content',
    collapsible: true,
    items: [
      item({
        to: '/app/content-library',
        labelKey: 'content_library',
        iconKey: 'content_library',
        roles: [...CATECHIST_ROLES, 'CONTENT_REVIEWER'],
        groupId: 'content',
      }),
      item({
        to: '/app/official-library',
        labelKey: 'official_library',
        iconKey: 'official_library',
        roles: [...CATECHIST_ROLES, 'CONTENT_REVIEWER'],
        groupId: 'content',
      }),
      ...(AI_FEATURES_ENABLED
        ? [
            item({
              to: '/app/ai-hub',
              labelKey: 'ai_hub',
              iconKey: 'ai_hub',
              roles: [...CATECHIST_ROLES, 'CONTENT_REVIEWER'],
              groupId: 'content',
            }),
          ]
        : []),
      item({
        to: '/app/bible',
        labelKey: 'bible',
        iconKey: 'bible',
        roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'],
        groupId: 'content',
      }),
      item({
        to: '/app/catechism',
        labelKey: 'catechism',
        iconKey: 'catechism',
        roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'],
        groupId: 'content',
      }),
      item({
        to: '/app/directory',
        labelKey: 'directory',
        iconKey: 'directory',
        roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'],
        groupId: 'content',
      }),
      item({
        to: '/app/sacramental-journeys',
        labelKey: 'sacraments',
        iconKey: 'sacraments',
        roles: [...STAFF_ROLES, 'LEAD_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'PASTORAL_VIEWER'],
        groupId: 'content',
      }),
      item({
        to: '/app/journey-templates',
        labelKey: 'journey_templates',
        iconKey: 'journey_templates',
        roles: [...STAFF_ROLES, 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'],
        groupId: 'content',
      }),
      item({
        to: '/app/documents',
        labelKey: 'documents',
        iconKey: 'documents',
        roles: [...CATECHIST_ROLES, 'GUARDIAN'],
        groupId: 'content',
      }),
    ],
  },
  {
    id: 'management',
    labelKey: 'management',
    collapsible: true,
    items: [
      item({ to: '/app/parishes', labelKey: 'parishes', iconKey: 'parishes', roles: STAFF_ROLES, groupId: 'management' }),
      item({
        to: '/app/communities',
        labelKey: 'communities',
        iconKey: 'communities',
        roles: CATECHIST_ROLES,
        groupId: 'management',
      }),
      item({
        to: '/app/reports',
        labelKey: 'reports',
        iconKey: 'reports',
        roles: [...STAFF_ROLES, 'PASTORAL_VIEWER'],
        groupId: 'management',
      }),
      item({
        to: '/app/catechetical-years',
        labelKey: 'catechetical_years',
        iconKey: 'catechetical_years',
        roles: [...STAFF_ROLES],
        groupId: 'management',
      }),
      item({
        to: '/app/formation',
        labelKey: 'formation',
        iconKey: 'formation',
        roles: CATECHIST_ROLES,
        groupId: 'management',
      }),
    ],
  },
  {
    id: 'settings',
    labelKey: 'settings',
    collapsible: true,
    items: [
      item({ to: '/app/settings', labelKey: 'settings', iconKey: 'settings', roles: ALL_ROLES, groupId: 'settings' }),
      item({
        to: '/app/billing',
        labelKey: 'billing',
        iconKey: 'billing',
        roles: [...STAFF_ROLES, 'PLATFORM_MEMBER'],
        groupId: 'settings',
      }),
      item({ to: '/app/consents', labelKey: 'consents', iconKey: 'consents', roles: ['GUARDIAN'], groupId: 'settings' }),
      item({ to: '/admin', labelKey: 'admin', iconKey: 'admin', roles: [], groupId: 'settings' }),
    ],
  },
];

export const ALL_NAV_ITEMS: NavItemConfig[] = NAV_GROUPS.flatMap((g) => g.items);

export const WEB_NAV_ICON_KEYS = ALL_NAV_ITEMS.map((item) => item.iconKey);

export const BOTTOM_NAV_KEYS = ['dashboard', 'community', 'classes', 'calendar'] as const;

export const TAB_ROUTE_BY_ICON: Record<string, string> = {
  dashboard: 'index',
  community: 'community',
  classes: 'classes',
  calendar: 'calendar',
  messages: 'messages',
  groups: 'groups',
  bible: 'bible-tab',
};

export function getBottomNavKeysForRole(role: string, isAdmin: boolean): string[] {
  if (isAdmin) return ['dashboard', 'community', 'classes', 'calendar'];
  if (COORDINATOR_ROLES.has(role) || role === 'PERSONAL_OWNER') {
    return ['dashboard', 'community', 'classes', 'calendar'];
  }
  if (CATECHIST_ONLY_ROLES.has(role)) return ['dashboard', 'community', 'classes', 'calendar'];
  if (role === 'GUARDIAN' || role === 'CATECHUMEN') return ['dashboard', 'community', 'calendar', 'messages'];
  if (role === 'PLATFORM_MEMBER') return ['dashboard', 'groups', 'bible', 'calendar'];
  if (role === 'PASTORAL_VIEWER' || role === 'CONTENT_REVIEWER') {
    return ['dashboard', 'community', 'classes', 'calendar'];
  }
  return [...BOTTOM_NAV_KEYS];
}

function shouldShowAiNavItem(navItem: { to: string; iconKey: string }) {
  if (AI_FEATURES_ENABLED) return true;
  if (navItem.iconKey === 'ai_hub') return false;
  return !navItem.to.startsWith('/app/ai-');
}

function shouldShowSocialNavItem(navItem: { to: string; iconKey: string }) {
  if (SOCIAL_FEATURES_ENABLED) return true;
  if (navItem.iconKey === 'community') return false;
  return !navItem.to.startsWith('/app/comunidade');
}

function filterLaunchHidden(items: NavItemConfig[]) {
  return items.filter((navItem) => shouldShowAiNavItem(navItem) && shouldShowSocialNavItem(navItem));
}

export function filterByRole(items: NavItemConfig[], userRole: string, isAdmin: boolean): NavItemConfig[] {
  if (isAdmin) return filterLaunchHidden(items);
  if (!userRole) return [];
  const effectiveRole = userRole === 'PERSONAL_OWNER' ? 'PARISH_COORDINATOR' : userRole;
  return filterLaunchHidden(
    items.filter((navItem) => navItem.roles.includes(effectiveRole) || navItem.roles.includes(userRole)),
  );
}

export function filterByWorkspace(items: NavItemConfig[], workspaceType?: string | null): NavItemConfig[] {
  if (workspaceType !== 'PERSONAL') return items;
  return items.filter((navItem) => !PERSONAL_HIDDEN_ICON_KEYS.has(navItem.iconKey));
}

export function getVisibleNavigation(ctx: WorkspaceNavContext): VisibleNavigation {
  const apply = (items: NavItemConfig[]) =>
    filterLaunchHidden(filterByWorkspace(filterByRole(items, ctx.role, ctx.isAdmin), ctx.workspaceType));

  const groups: VisibleNavGroup[] = NAV_GROUPS.map((g) => ({
    id: g.id,
    labelKey: g.labelKey,
    collapsible: g.collapsible,
    items: apply(g.items),
  })).filter((g) => g.items.length > 0);

  const all = groups.flatMap((g) => g.items);
  const bottomKeys = getBottomNavKeysForRole(ctx.role, ctx.isAdmin);
  const bottomBar: NavItemConfig[] = [];
  for (const key of bottomKeys) {
    const found = ALL_NAV_ITEMS.find((navItem) => navItem.iconKey === key);
    if (!found) continue;
    const [visible] = apply([found]);
    if (visible) bottomBar.push(visible);
  }
  if (bottomBar.length > 4) bottomBar.length = 4;

  const barKeys = new Set(bottomBar.map((navItem) => navItem.iconKey));
  const sheetItems = all.filter((navItem) => !barKeys.has(navItem.iconKey));
  const sheetGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((navItem) => !barKeys.has(navItem.iconKey)) }))
    .filter((g) => g.items.length > 0);

  return { bottomBar, sheetItems, groups, sheetGroups, all };
}

export function labelFor(iconKey: string) {
  return NAV_ITEM_LABELS[iconKey] || iconKey;
}
