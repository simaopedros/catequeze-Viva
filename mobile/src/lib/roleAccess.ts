const STAFF_AND_CATECHIST = new Set([
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
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
