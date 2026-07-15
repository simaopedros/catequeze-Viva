/**
 * Pure family-surface helpers (safe for unit tests without Wasp env).
 */
import { FAMILY_PORTAL_ROLES } from './portal';

export const STAFF_PORTAL_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'CONTENT_REVIEWER',
  'PASTORAL_VIEWER',
] as const;

export type PortalSurface = 'PORTAL' | 'STAFF';

export function isFamilyPortalRole(role?: string | null): boolean {
  return !!role && (FAMILY_PORTAL_ROLES as readonly string[]).includes(role);
}

export function isStaffPortalRole(role?: string | null): boolean {
  return !!role && (STAFF_PORTAL_ROLES as readonly string[]).includes(role);
}

export function rolesAreFamilyOnly(roles: string[]): boolean {
  if (!roles.length) return false;
  const hasFamily = roles.some(isFamilyPortalRole);
  const hasStaff = roles.some(isStaffPortalRole);
  return hasFamily && !hasStaff;
}

export function resolvePortalSurfaceFromRoles(
  roles: string[],
  surface?: string | null,
  hostIsFamily = false,
): PortalSurface {
  const explicit = (surface || '').toUpperCase();
  if (explicit === 'PORTAL') return 'PORTAL';
  if (explicit === 'STAFF') {
    if (rolesAreFamilyOnly(roles)) return 'PORTAL';
    return 'STAFF';
  }
  if (hostIsFamily) return 'PORTAL';
  if (rolesAreFamilyOnly(roles)) return 'PORTAL';
  return 'STAFF';
}
