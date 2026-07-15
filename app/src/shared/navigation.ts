// ---- Navigation Item Config (without icon component — icons mapped per component) ----
export interface NavItemConfig {
  to: string;
  labelKey: string; // i18n key from 'navigation' namespace
  roles: string[];
  iconKey: string; // string identifier for icon mapping
}

export interface NavSectionConfig {
  section: string;
  items: NavItemConfig[];
}

export type WorkspaceNavContext = {
  role: string;
  isAdmin: boolean;
  /** PERSONAL | PARISH | DIOCESE | COMMUNITY — UX filter only, not AuthZ */
  workspaceType?: string | null;
};

export type VisibleNavigation = {
  primary: NavItemConfig[];
  more: NavItemConfig[];
  bottom: NavItemConfig[];
  all: NavItemConfig[];
  /** Up to 4 items from BOTTOM_NAV_KEYS after role+workspace filters; no padding */
  bottomBar: NavItemConfig[];
  /** (primary ∪ more ∪ bottom) − bottomBar, section order preserved */
  sheetItems: NavItemConfig[];
};

// ---- Role Constants ----
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
];

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
];
const CATECHIST_ROLES = [
  ...STAFF_ROLES,
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'PERSONAL_OWNER',
];
const VIEWER_ROLES = [...CATECHIST_ROLES, 'PASTORAL_VIEWER', 'CONTENT_REVIEWER'];
const LEARNER_ROLES = [...VIEWER_ROLES, 'GUARDIAN', 'CATECHUMEN'];

/**
 * Hidden in PERSONAL workspace chrome (sidebar / bottom / More sheet).
 * Navigation filter is UX only — server access-control remains authoritative.
 */
export const PERSONAL_HIDDEN_ICON_KEYS = new Set([
  'parishes',
  'communities',
  'catechetical_years',
  'reports',
]);

// ---- Sidebar Navigation Sections ----
// Primary section: daily-use items, always visible without a section header.
// More section: secondary items, collapsed by default under "More".
// Bottom section: always-visible utilities at the sidebar bottom.
export const NAV_SECTIONS: NavSectionConfig[] = [
  {
    section: 'primary',
    items: [
      { to: '/app', labelKey: 'dashboard', iconKey: 'dashboard', roles: LEARNER_ROLES },
      { to: '/app/classes', labelKey: 'classes', iconKey: 'classes', roles: VIEWER_ROLES },
      {
        to: '/app/catechumens',
        labelKey: 'catechumens',
        iconKey: 'catechumens',
        roles: [...VIEWER_ROLES, 'GUARDIAN'],
      },
      {
        to: '/app/content-library',
        labelKey: 'content_library',
        iconKey: 'content_library',
        roles: [...CATECHIST_ROLES, 'CONTENT_REVIEWER'],
      },
      {
        to: '/app/ai-hub',
        labelKey: 'ai_hub',
        iconKey: 'ai_hub',
        roles: [...CATECHIST_ROLES, 'CONTENT_REVIEWER'],
      },
      { to: '/app/calendar', labelKey: 'calendar', iconKey: 'calendar', roles: LEARNER_ROLES },
      {
        to: '/app/bible',
        labelKey: 'bible',
        iconKey: 'bible',
        roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'],
      },
      {
        to: '/app/messages',
        labelKey: 'messages',
        iconKey: 'messages',
        roles: [...CATECHIST_ROLES, 'GUARDIAN', 'CATECHUMEN'],
      },
    ],
  },
  {
    section: 'more',
    items: [
      { to: '/app/parishes', labelKey: 'parishes', iconKey: 'parishes', roles: STAFF_ROLES },
      {
        to: '/app/communities',
        labelKey: 'communities',
        iconKey: 'communities',
        roles: CATECHIST_ROLES,
      },
      { to: '/app/families', labelKey: 'families', iconKey: 'families', roles: CATECHIST_ROLES },
      {
        to: '/app/directory',
        labelKey: 'directory',
        iconKey: 'directory',
        roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'],
      },
      {
        to: '/app/catechism',
        labelKey: 'catechism',
        iconKey: 'catechism',
        roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'],
      },
      {
        to: '/app/sacramental-journeys',
        labelKey: 'sacraments',
        iconKey: 'sacraments',
        roles: [
          ...STAFF_ROLES,
          'LEAD_CATECHIST',
          'GUARDIAN',
          'CATECHUMEN',
          'PASTORAL_VIEWER',
        ],
      },
      {
        to: '/app/journey-templates',
        labelKey: 'journey_templates',
        iconKey: 'journey_templates',
        roles: [...STAFF_ROLES, 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'],
      },
      {
        to: '/app/documents',
        labelKey: 'documents',
        iconKey: 'documents',
        roles: [...CATECHIST_ROLES, 'GUARDIAN'],
      },
      {
        to: '/app/reports',
        labelKey: 'reports',
        iconKey: 'reports',
        roles: [...STAFF_ROLES, 'PASTORAL_VIEWER'],
      },
    ],
  },
  {
    section: 'bottom',
    items: [
      { to: '/app/settings', labelKey: 'settings', iconKey: 'settings', roles: ALL_ROLES },
      { to: '/app/billing', labelKey: 'billing', iconKey: 'billing', roles: CATECHIST_ROLES },
      { to: '/app/consents', labelKey: 'consents', iconKey: 'consents', roles: ['GUARDIAN'] },
      {
        to: '/app/catechetical-years',
        labelKey: 'catechetical_years',
        iconKey: 'catechetical_years',
        roles: [...STAFF_ROLES],
      },
      // roles: [] — only included when isAdmin (see filterByRole)
      { to: '/admin', labelKey: 'admin', iconKey: 'admin', roles: [] },
    ],
  },
];

// ---- Bottom Navigation Items (Mobile) ----
// Max 4 primary destinations; settings and the rest live under "More"
export const BOTTOM_NAV_KEYS = [
  'dashboard',
  'classes',
  'catechumens',
  'calendar',
] as const;

// ---- Role Filtering ----
// NOTE: Navigation filter is not AuthZ. Hiding a path in the UI does not
// replace server-side access control.
export function filterByRole(
  items: NavItemConfig[],
  userRole: string,
  isAdmin: boolean,
): NavItemConfig[] {
  if (isAdmin) return items;
  if (!userRole) return [];

  // PERSONAL_OWNER sees everything a coordinator sees (defensive for items
  // that list only PARISH_COORDINATOR without PERSONAL_OWNER).
  const effectiveRole =
    userRole === 'PERSONAL_OWNER' ? 'PARISH_COORDINATOR' : userRole;

  return items.filter(
    (i) => i.roles.includes(effectiveRole) || i.roles.includes(userRole),
  );
}

export function filterByWorkspace(
  items: NavItemConfig[],
  workspaceType?: string | null,
): NavItemConfig[] {
  if (workspaceType !== 'PERSONAL') return items;
  return items.filter((i) => !PERSONAL_HIDDEN_ICON_KEYS.has(i.iconKey));
}

/**
 * Single source of truth for sidebar, bottom bar, and More sheet visibility.
 */
export function getVisibleNavigation(
  ctx: WorkspaceNavContext,
): VisibleNavigation {
  const apply = (items: NavItemConfig[]) =>
    filterByWorkspace(filterByRole(items, ctx.role, ctx.isAdmin), ctx.workspaceType);

  const primarySection = NAV_SECTIONS.find((s) => s.section === 'primary');
  const moreSection = NAV_SECTIONS.find((s) => s.section === 'more');
  const bottomSection = NAV_SECTIONS.find((s) => s.section === 'bottom');

  const primary = apply(primarySection?.items ?? []);
  const more = apply(moreSection?.items ?? []);
  const bottom = apply(bottomSection?.items ?? []);
  const all = [...primary, ...more, ...bottom];

  const bottomBar: NavItemConfig[] = [];
  for (const key of BOTTOM_NAV_KEYS) {
    const item = ALL_NAV_ITEMS.find((i) => i.iconKey === key);
    if (!item) continue;
    const [visible] = apply([item]);
    if (visible) bottomBar.push(visible);
  }

  const barKeys = new Set(bottomBar.map((i) => i.iconKey));
  const sheetItems = all.filter((i) => !barKeys.has(i.iconKey));

  return { primary, more, bottom, all, bottomBar, sheetItems };
}

// ---- Flatten all items for lookup ----
export const ALL_NAV_ITEMS: NavItemConfig[] = NAV_SECTIONS.flatMap((s) => s.items);
