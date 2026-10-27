/**
 * Central admin UI labels for raw codes (plans, audit actions, roles, etc.).
 * Prefer catalog / i18n mappings; fall back to a readable form of the code.
 */
import {
  DEFAULT_PLANS_BY_SLUG,
  PLAN_NAMES,
  resolvePlanId,
  type CatalogBySlug,
} from './planCatalog';

export type AdminLabelTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export type AdminCodeKind =
  | 'auditAction'
  | 'auditOperation'
  | 'entityType'
  | 'role'
  | 'status'
  | 'parishType'
  | 'membershipStatus';

/** MEMBER_INVITE / PendingInvitation / single → readable fallback. */
export function humanizeAdminCode(code: string | null | undefined): string {
  if (!code?.trim()) return '';
  const words = code
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Plan slug → catalog display name (handles SINGLE, catechist_free, aliases).
 * Unknown slugs fall back to a readable code instead of the free-plan name.
 */
export function resolveAdminPlanLabel(
  plan: string | null | undefined,
  options?: {
    catalog?: CatalogBySlug;
    nameBySlug?: Map<string, string> | Record<string, string>;
  },
): string {
  if (!plan?.trim()) return '';
  const raw = plan.trim();
  const lower = raw.toLowerCase();
  const nameBySlug = options?.nameBySlug;
  if (nameBySlug) {
    const fromMap =
      nameBySlug instanceof Map
        ? nameBySlug.get(lower) ?? nameBySlug.get(raw)
        : nameBySlug[lower] ?? nameBySlug[raw];
    if (fromMap) return fromMap;
  }
  const catalog = options?.catalog ?? DEFAULT_PLANS_BY_SLUG;
  const resolved = resolvePlanId(raw, catalog);
  if (resolved && catalog[resolved]?.name) return catalog[resolved].name;
  const fromNames =
    PLAN_NAMES[lower] ?? PLAN_NAMES[raw] ?? PLAN_NAMES[raw.toUpperCase()];
  if (fromNames) return fromNames;
  return humanizeAdminCode(raw);
}

function lookupTranslated(
  t: AdminLabelTranslate,
  key: string,
): string | null {
  const translated = t(key);
  if (!translated || translated === key) return null;
  return translated;
}

/** Resolve an admin enum/code via i18n, with humanize fallback. */
export function resolveAdminCodeLabel(
  kind: AdminCodeKind,
  code: string | null | undefined,
  tAdmin: AdminLabelTranslate,
  tCommon?: AdminLabelTranslate,
): string {
  if (!code?.trim()) return '—';
  const value = code.trim();
  let translated: string | null = null;

  switch (kind) {
    case 'auditAction':
      translated = lookupTranslated(tAdmin, `labels.audit_actions.${value}`);
      break;
    case 'auditOperation':
      translated = lookupTranslated(
        tAdmin,
        `labels.audit_operations.${value}`,
      );
      break;
    case 'entityType':
      translated = lookupTranslated(tAdmin, `labels.entity_types.${value}`);
      break;
    case 'role':
      translated = lookupTranslated(tCommon ?? tAdmin, `roles.${value}`);
      break;
    case 'status':
      translated = lookupTranslated(
        tAdmin,
        `pages.licenses.status_${value}`,
      );
      break;
    case 'parishType':
      translated = lookupTranslated(
        tAdmin,
        `pages.parishes.type_${value}`,
      );
      break;
    case 'membershipStatus':
      translated = lookupTranslated(
        tCommon ?? tAdmin,
        `membership_status.${value}`,
      );
      break;
    default:
      break;
  }

  return translated ?? humanizeAdminCode(value);
}
