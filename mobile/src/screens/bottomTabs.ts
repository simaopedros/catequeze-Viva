/** Staff default bar — same keys as web BOTTOM_NAV_KEYS. */
export const STAFF_TAB_KEYS = ['dashboard', 'community', 'classes', 'calendar'] as const;

export function getMobileBottomTabKeys(role?: string | null, isAdmin?: boolean): string[] {
  if (isAdmin) return [...STAFF_TAB_KEYS];
  if (!role) return [...STAFF_TAB_KEYS];
  if (
    role === 'SUPER_ADMIN' ||
    role === 'DIOCESE_ADMIN' ||
    role === 'PARISH_COORDINATOR' ||
    role === 'COMMUNITY_COORDINATOR' ||
    role === 'PERSONAL_OWNER' ||
    role === 'LEAD_CATECHIST' ||
    role === 'ASSISTANT_CATECHIST' ||
    role === 'PASTORAL_VIEWER' ||
    role === 'CONTENT_REVIEWER'
  ) {
    return [...STAFF_TAB_KEYS];
  }
  if (role === 'GUARDIAN' || role === 'CATECHUMEN') {
    return ['dashboard', 'community', 'calendar', 'messages'];
  }
  if (role === 'PLATFORM_MEMBER') {
    return ['dashboard', 'groups', 'bible', 'calendar'];
  }
  return [...STAFF_TAB_KEYS];
}
