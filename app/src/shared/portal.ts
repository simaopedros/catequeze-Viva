/**
 * Portal host detection and URL helpers.
 *
 * Two hosts serve the same Wasp app:
 *  - catequeseviva.com       (staff / institutional tool)
 *  - familia.catequeseviva.com  (family portal for guardians & catechumens)
 */

/** The family portal hostname (env-configurable, defaults to production). */
export const FAMILY_PORTAL_HOST: string =
  (typeof process !== 'undefined' && process.env?.FAMILY_PORTAL_HOST) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.REACT_APP_FAMILY_PORTAL_HOST) ||
  'familia.catequeseviva.com';

/** The main staff portal hostname (env-configurable). */
export const STAFF_PORTAL_HOST: string =
  (typeof process !== 'undefined' && process.env?.STAFF_PORTAL_HOST) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.REACT_APP_STAFF_PORTAL_HOST) ||
  'catequeseviva.com';

/**
 * Check whether the current hostname is the family portal.
 * Falls back to `window.location.hostname` when running in the browser.
 */
export function isFamilyPortalHost(hostname?: string): boolean {
  const h = hostname || (typeof window !== 'undefined' ? window.location.hostname : '');
  return h === FAMILY_PORTAL_HOST || h.startsWith('familia.');
}

/**
 * Build a full URL for a path on the family portal.
 */
export function familyPortalUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : '/' + path;
  return `https://${FAMILY_PORTAL_HOST}${normalized}`;
}

/**
 * Build a full URL for a path on the main staff portal.
 */
export function staffPortalUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : '/' + path;
  return `https://${STAFF_PORTAL_HOST}${normalized}`;
}

/** Roles that are family-portal users (guardians and catechumens only). */
export const FAMILY_PORTAL_ROLES = ['GUARDIAN', 'CATECHUMEN'];

/**
 * Check if the given role should be served by the family portal.
 */
export function isFamilyPortalRole(role?: string | null): boolean {
  return !!role && FAMILY_PORTAL_ROLES.includes(role);
}
