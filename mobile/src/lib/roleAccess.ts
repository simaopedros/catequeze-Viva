const STAFF_AND_CATECHIST = new Set([
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
]);

const COORDINATOR_ROLES = new Set([
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
]);

export function isFamilyRole(role?: string | null): boolean {
  return role === 'GUARDIAN' || role === 'CATECHUMEN';
}

export function canMarkAttendance(role?: string | null, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  if (isFamilyRole(role)) return false;
  if (!role) return true;
  return STAFF_AND_CATECHIST.has(role);
}

/** Turmas, encontros, avisos, grupos, pessoas — catequista e coordenação. */
export function canManagePastoral(role?: string | null, isAdmin?: boolean): boolean {
  return canMarkAttendance(role, isAdmin);
}

/** Formação e paróquias — só coordenação. */
export function canManageCoordinator(role?: string | null, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  if (!role) return false;
  return COORDINATOR_ROLES.has(role);
}

export function canCreateCalendarEvent(role?: string | null, isAdmin?: boolean): boolean {
  return canManagePastoral(role, isAdmin);
}
