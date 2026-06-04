// ---- Navigation Item Config (without icon component — icons mapped per component) ----
export interface NavItemConfig {
  to: string;
  labelKey: string;  // i18n key from 'navigation' namespace
  roles: string[];
  iconKey: string;   // string identifier for icon mapping
}

export interface NavSectionConfig {
  section: string;
  items: NavItemConfig[];
}

// ---- Role Constants ----
const ALL_ROLES = [
  'SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN',
  'CONTENT_REVIEWER', 'PASTORAL_VIEWER',
];

const STAFF_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];
const CATECHIST_ROLES = [...STAFF_ROLES, 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'];
const VIEWER_ROLES = [...CATECHIST_ROLES, 'PASTORAL_VIEWER'];
const LEARNER_ROLES = [...VIEWER_ROLES, 'GUARDIAN', 'CATECHUMEN'];

// ---- Sidebar Navigation Sections ----
export const NAV_SECTIONS: NavSectionConfig[] = [
  {
    section: 'people',
    items: [
      { to: '/app', labelKey: 'dashboard', iconKey: 'dashboard', roles: LEARNER_ROLES },
      { to: '/app/parishes', labelKey: 'parishes', iconKey: 'parishes', roles: STAFF_ROLES },
      { to: '/app/communities', labelKey: 'communities', iconKey: 'communities', roles: CATECHIST_ROLES },
      { to: '/app/classes', labelKey: 'classes', iconKey: 'classes', roles: VIEWER_ROLES },
      { to: '/app/catechumens', labelKey: 'catechumens', iconKey: 'catechumens', roles: LEARNER_ROLES },
      { to: '/app/families', labelKey: 'families', iconKey: 'families', roles: CATECHIST_ROLES },
    ],
  },
  {
    section: 'pedagogy',
    items: [
      { to: '/app/content-library', labelKey: 'content_library', iconKey: 'content_library', roles: [...CATECHIST_ROLES, 'CONTENT_REVIEWER'] },
      { to: '/app/ai-planner', labelKey: 'ai_planner', iconKey: 'ai_planner', roles: [...CATECHIST_ROLES, 'CONTENT_REVIEWER'] },
      { to: '/app/calendar', labelKey: 'calendar', iconKey: 'calendar', roles: LEARNER_ROLES },
      { to: '/app/bible', labelKey: 'bible', iconKey: 'bible', roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'] },
      { to: '/app/directory', labelKey: 'directory', iconKey: 'directory', roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'] },
      { to: '/app/catechism', labelKey: 'catechism', iconKey: 'catechism', roles: [...LEARNER_ROLES, 'CONTENT_REVIEWER'] },
    ],
  },
  {
    section: 'pastoral',
    items: [
      { to: '/app/messages', labelKey: 'messages', iconKey: 'messages', roles: [...STAFF_ROLES, 'LEAD_CATECHIST', 'GUARDIAN'] },
      { to: '/app/sacramental-journeys', labelKey: 'sacraments', iconKey: 'sacraments', roles: [...STAFF_ROLES, 'LEAD_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'PASTORAL_VIEWER'] },
      { to: '/app/documents', labelKey: 'documents', iconKey: 'documents', roles: [...CATECHIST_ROLES, 'GUARDIAN'] },
      { to: '/app/reports', labelKey: 'reports', iconKey: 'reports', roles: [...STAFF_ROLES, 'PASTORAL_VIEWER'] },
    ],
  },
  {
    section: 'bottom',
    items: [
      { to: '/app/settings', labelKey: 'settings', iconKey: 'settings', roles: ALL_ROLES },
      { to: '/app/billing', labelKey: 'billing', iconKey: 'billing', roles: ALL_ROLES },
      { to: '/app/consents', labelKey: 'consents', iconKey: 'consents', roles: ['GUARDIAN'] },
      { to: '/app/catechetical-years', labelKey: 'catechetical_years', iconKey: 'catechetical_years', roles: [...STAFF_ROLES] },
      { to: '/admin', labelKey: 'admin', iconKey: 'admin', roles: [...STAFF_ROLES] },
    ],
  },
];

// ---- Bottom Navigation Items (Mobile) ----
// Keys matching NAV_SECTIONS items; rendered in order, max 4
export const BOTTOM_NAV_KEYS = ['dashboard', 'classes', 'catechumens', 'calendar', 'settings'] as const;

// ---- Role Filtering ----
export function filterByRole(items: NavItemConfig[], userRole: string, isAdmin: boolean): NavItemConfig[] {
  if (isAdmin) return items;
  if (!userRole) return [];
  return items.filter(i => i.roles.includes(userRole));
}

// ---- Flatten all items for lookup ----
export const ALL_NAV_ITEMS: NavItemConfig[] = NAV_SECTIONS.flatMap(s => s.items);
