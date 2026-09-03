// ---- Navigation Item Config (without icon component — icons mapped per component) ----
import { AI_FEATURES_ENABLED, shouldShowAiNavItem } from "./aiFeatures";
import { shouldShowSocialNavItem } from "./socialFeatures";
import { NAV_GROUP_LABEL_KEYS, type NavGroupId } from "./uiPresentation";

export interface NavItemConfig {
  to: string;
  labelKey: string; // i18n key from 'navigation' namespace
  roles: string[];
  iconKey: string; // string identifier for icon mapping
  groupId: NavGroupId;
}

export interface NavSectionConfig {
  section: string;
  items: NavItemConfig[];
}

export interface NavGroupConfig {
  id: NavGroupId;
  /** i18n key under navigation namespace */
  labelKey: string;
  /** Operation group stays open; others collapsible */
  collapsible: boolean;
  items: NavItemConfig[];
}

export type WorkspaceNavContext = {
  role: string;
  isAdmin: boolean;
  /** PERSONAL | PARISH | DIOCESE | COMMUNITY — UX filter only, not AuthZ */
  workspaceType?: string | null;
};

export type VisibleNavGroup = {
  id: NavGroupId;
  labelKey: string;
  collapsible: boolean;
  items: NavItemConfig[];
};

export type VisibleNavigation = {
  /** @deprecated Prefer `groups` — operation items only (compat) */
  primary: NavItemConfig[];
  /** @deprecated Prefer `groups` — non-settings secondary items (compat) */
  more: NavItemConfig[];
  /** Settings / bottom utilities */
  bottom: NavItemConfig[];
  all: NavItemConfig[];
  /** Up to 4 items after role+workspace filters; no padding */
  bottomBar: NavItemConfig[];
  /** (all) − bottomBar, group order preserved */
  sheetItems: NavItemConfig[];
  /** Task-oriented groups for sidebar + More sheet */
  groups: VisibleNavGroup[];
  /** Sheet items already bucketed by group (excludes bottomBar keys) */
  sheetGroups: VisibleNavGroup[];
};

// ---- Role Constants ----
const ALL_ROLES = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "LEAD_CATECHIST",
  "ASSISTANT_CATECHIST",
  "GUARDIAN",
  "CATECHUMEN",
  "CONTENT_REVIEWER",
  "PASTORAL_VIEWER",
  "PERSONAL_OWNER",
];

const STAFF_ROLES = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
];
const CATECHIST_ROLES = [
  ...STAFF_ROLES,
  "LEAD_CATECHIST",
  "ASSISTANT_CATECHIST",
  "PERSONAL_OWNER",
];
const VIEWER_ROLES = [
  ...CATECHIST_ROLES,
  "PASTORAL_VIEWER",
  "CONTENT_REVIEWER",
];
const LEARNER_ROLES = [...VIEWER_ROLES, "GUARDIAN", "CATECHUMEN"];

const COORDINATOR_ROLES = new Set([
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
]);

const CATECHIST_ONLY_ROLES = new Set(["LEAD_CATECHIST", "ASSISTANT_CATECHIST"]);

/**
 * Hidden in PERSONAL workspace chrome (sidebar / bottom / More sheet).
 * Navigation filter is UX only — server access-control remains authoritative.
 *
 * Parishes, communities, catechetical years and network reports stay hidden
 * in PERSONAL chrome. Institutional setup happens via “Organizar como paróquia”
 * (billing) and invites — not via parish-management destinations.
 */
export const PERSONAL_HIDDEN_ICON_KEYS = new Set([
  "catechetical_years",
  "reports",
  "parishes",
  "communities",
]);

function item(
  partial: Omit<NavItemConfig, "groupId"> & { groupId: NavGroupId },
): NavItemConfig {
  return partial;
}

// ---- Task-oriented navigation groups ----
// Order = discovery hierarchy. Authorization remains server-side.
export const NAV_GROUPS: NavGroupConfig[] = [
  {
    id: "operation",
    labelKey: NAV_GROUP_LABEL_KEYS.operation,
    collapsible: false,
    items: [
      item({
        to: "/app",
        labelKey: "dashboard",
        iconKey: "dashboard",
        roles: LEARNER_ROLES,
        groupId: "operation",
      }),
      item({
        to: "/app/classes",
        labelKey: "classes",
        iconKey: "classes",
        roles: VIEWER_ROLES,
        groupId: "operation",
      }),
      item({
        to: "/app/calendar",
        labelKey: "calendar",
        iconKey: "calendar",
        roles: LEARNER_ROLES,
        groupId: "operation",
      }),
      item({
        to: "/app/messages",
        labelKey: "messages",
        iconKey: "messages",
        roles: [...CATECHIST_ROLES, "GUARDIAN", "CATECHUMEN"],
        groupId: "operation",
      }),
    ],
  },
  {
    id: "people",
    labelKey: NAV_GROUP_LABEL_KEYS.people,
    collapsible: true,
    items: [
      item({
        to: "/app/catechumens",
        labelKey: "catechumens",
        iconKey: "catechumens",
        roles: [...VIEWER_ROLES, "GUARDIAN"],
        groupId: "people",
      }),
      item({
        to: "/app/families",
        labelKey: "families",
        iconKey: "families",
        roles: CATECHIST_ROLES,
        groupId: "people",
      }),
      item({
        to: "/app/team",
        labelKey: "team",
        iconKey: "team",
        roles: CATECHIST_ROLES,
        groupId: "people",
      }),
      item({
        to: "/app/family-invites",
        labelKey: "family_portal_invites",
        iconKey: "family_portal_invites",
        roles: CATECHIST_ROLES,
        groupId: "people",
      }),
    ],
  },
  {
    id: "content",
    labelKey: NAV_GROUP_LABEL_KEYS.content,
    collapsible: true,
    items: [
      item({
        to: "/app/content-library",
        labelKey: "content_library",
        iconKey: "content_library",
        roles: [...CATECHIST_ROLES, "CONTENT_REVIEWER"],
        groupId: "content",
      }),
      // The Comunidade feed is open to every role: anyone may read and share,
      // only subscribers may publish (enforced server-side).
      item({
        to: "/app/comunidade",
        labelKey: "community",
        iconKey: "community",
        roles: ALL_ROLES,
        groupId: "content",
      }),
      ...(AI_FEATURES_ENABLED
        ? [
            item({
              to: "/app/ai-hub",
              labelKey: "ai_hub",
              iconKey: "ai_hub",
              roles: [...CATECHIST_ROLES, "CONTENT_REVIEWER"],
              groupId: "content",
            }),
          ]
        : []),
      item({
        to: "/app/bible",
        labelKey: "bible",
        iconKey: "bible",
        roles: [...LEARNER_ROLES, "CONTENT_REVIEWER"],
        groupId: "content",
      }),
      item({
        to: "/app/catechism",
        labelKey: "catechism",
        iconKey: "catechism",
        roles: [...LEARNER_ROLES, "CONTENT_REVIEWER"],
        groupId: "content",
      }),
      item({
        to: "/app/directory",
        labelKey: "directory",
        iconKey: "directory",
        roles: [...LEARNER_ROLES, "CONTENT_REVIEWER"],
        groupId: "content",
      }),
      item({
        to: "/app/sacramental-journeys",
        labelKey: "sacraments",
        iconKey: "sacraments",
        roles: [
          ...STAFF_ROLES,
          "LEAD_CATECHIST",
          "GUARDIAN",
          "CATECHUMEN",
          "PASTORAL_VIEWER",
        ],
        groupId: "content",
      }),
      item({
        to: "/app/journey-templates",
        labelKey: "journey_templates",
        iconKey: "journey_templates",
        roles: [...STAFF_ROLES, "LEAD_CATECHIST", "ASSISTANT_CATECHIST"],
        groupId: "content",
      }),
      item({
        to: "/app/documents",
        labelKey: "documents",
        iconKey: "documents",
        roles: [...CATECHIST_ROLES, "GUARDIAN"],
        groupId: "content",
      }),
    ],
  },
  {
    id: "management",
    labelKey: NAV_GROUP_LABEL_KEYS.management,
    collapsible: true,
    items: [
      item({
        to: "/app/parishes",
        labelKey: "parishes",
        iconKey: "parishes",
        roles: STAFF_ROLES,
        groupId: "management",
      }),
      item({
        to: "/app/communities",
        labelKey: "communities",
        iconKey: "communities",
        roles: CATECHIST_ROLES,
        groupId: "management",
      }),
      item({
        to: "/app/reports",
        labelKey: "reports",
        iconKey: "reports",
        roles: [...STAFF_ROLES, "PASTORAL_VIEWER"],
        groupId: "management",
      }),
      item({
        to: "/app/catechetical-years",
        labelKey: "catechetical_years",
        iconKey: "catechetical_years",
        roles: [...STAFF_ROLES],
        groupId: "management",
      }),
    ],
  },
  {
    id: "settings",
    labelKey: NAV_GROUP_LABEL_KEYS.settings,
    collapsible: true,
    items: [
      item({
        to: "/app/settings",
        labelKey: "settings",
        iconKey: "settings",
        roles: ALL_ROLES,
        groupId: "settings",
      }),
      // Only coordinators / personal owners manage payment — not invited catechists.
      item({
        to: "/app/billing",
        labelKey: "billing",
        iconKey: "billing",
        roles: STAFF_ROLES,
        groupId: "settings",
      }),
      item({
        to: "/app/consents",
        labelKey: "consents",
        iconKey: "consents",
        roles: ["GUARDIAN"],
        groupId: "settings",
      }),
      // roles: [] — only included when isAdmin (see filterByRole)
      item({
        to: "/admin",
        labelKey: "admin",
        iconKey: "admin",
        roles: [],
        groupId: "settings",
      }),
    ],
  },
];

/** Flat sections derived for legacy consumers (primary / more / bottom) */
export const NAV_SECTIONS: NavSectionConfig[] = [
  {
    section: "primary",
    items: NAV_GROUPS.find((g) => g.id === "operation")?.items ?? [],
  },
  {
    section: "more",
    items: [
      ...(NAV_GROUPS.find((g) => g.id === "people")?.items ?? []),
      ...(NAV_GROUPS.find((g) => g.id === "content")?.items ?? []),
      ...(NAV_GROUPS.find((g) => g.id === "management")?.items ?? []),
    ],
  },
  {
    section: "bottom",
    items: NAV_GROUPS.find((g) => g.id === "settings")?.items ?? [],
  },
];

// ---- Bottom Navigation Items (Mobile) ----
// Max 4 primary destinations + "Mais" trigger = 5 slots total.
/** Default staff/catechist bar (frequency-first) */
export const BOTTOM_NAV_KEYS = [
  "dashboard",
  "classes",
  "calendar",
  "messages",
] as const;

/**
 * Role-aware bottom bar keys.
 * - Catechist: Início, Turmas, Agenda, Mensagens
 * - Coordination: Início, Turmas, Agenda, Pessoas (catechumens)
 * - Family portal: Início, Agenda, Mensagens (+ catechumens for guardian)
 */
export function getBottomNavKeysForRole(
  role: string,
  isAdmin: boolean,
): string[] {
  if (isAdmin) {
    return ["dashboard", "classes", "calendar", "messages"];
  }
  if (COORDINATOR_ROLES.has(role) || role === "PERSONAL_OWNER") {
    return ["dashboard", "classes", "calendar", "catechumens"];
  }
  if (CATECHIST_ONLY_ROLES.has(role)) {
    return ["dashboard", "classes", "calendar", "messages"];
  }
  if (role === "GUARDIAN") {
    return ["dashboard", "calendar", "messages", "catechumens"];
  }
  if (role === "CATECHUMEN") {
    return ["dashboard", "calendar", "messages"];
  }
  if (role === "PASTORAL_VIEWER" || role === "CONTENT_REVIEWER") {
    return ["dashboard", "classes", "calendar", "reports"].filter(Boolean);
  }
  return [...BOTTOM_NAV_KEYS];
}

// ---- Role Filtering ----
// NOTE: Navigation filter is not AuthZ. Hiding a path in the UI does not
// replace server-side access control.
export function filterByRole(
  items: NavItemConfig[],
  userRole: string,
  isAdmin: boolean,
): NavItemConfig[] {
  if (isAdmin) return filterLaunchHidden(items);
  if (!userRole) return [];

  // PERSONAL_OWNER sees everything a coordinator sees (defensive for items
  // that list only PARISH_COORDINATOR without PERSONAL_OWNER).
  const effectiveRole =
    userRole === "PERSONAL_OWNER" ? "PARISH_COORDINATOR" : userRole;

  return filterLaunchHidden(
    items.filter(
      (i) => i.roles.includes(effectiveRole) || i.roles.includes(userRole),
    ),
  );
}

export function filterByWorkspace(
  items: NavItemConfig[],
  workspaceType?: string | null,
): NavItemConfig[] {
  if (workspaceType !== "PERSONAL") return items;
  return items.filter((i) => !PERSONAL_HIDDEN_ICON_KEYS.has(i.iconKey));
}

/** Hides AI Hub / editorial and Comunidade surfaces while those modules are off. */
export function filterLaunchHidden(items: NavItemConfig[]): NavItemConfig[] {
  return items.filter(
    (item) => shouldShowAiNavItem(item) && shouldShowSocialNavItem(item),
  );
}

/**
 * Single source of truth for sidebar, bottom bar, and More sheet visibility.
 */
export function getVisibleNavigation(
  ctx: WorkspaceNavContext,
): VisibleNavigation {
  const apply = (items: NavItemConfig[]) =>
    filterLaunchHidden(
      filterByWorkspace(
        filterByRole(items, ctx.role, ctx.isAdmin),
        ctx.workspaceType,
      ),
    );

  const groups: VisibleNavGroup[] = NAV_GROUPS.map((g) => ({
    id: g.id,
    labelKey: g.labelKey,
    collapsible: g.collapsible,
    items: apply(g.items),
  })).filter((g) => g.items.length > 0);

  const primary = groups.find((g) => g.id === "operation")?.items ?? [];
  const more = groups
    .filter((g) => g.id !== "operation" && g.id !== "settings")
    .flatMap((g) => g.items);
  const bottom = groups.find((g) => g.id === "settings")?.items ?? [];
  const all = groups.flatMap((g) => g.items);

  const bottomKeys = getBottomNavKeysForRole(ctx.role, ctx.isAdmin);
  const bottomBar: NavItemConfig[] = [];
  for (const key of bottomKeys) {
    const found = ALL_NAV_ITEMS.find((i) => i.iconKey === key);
    if (!found) continue;
    const [visible] = apply([found]);
    if (visible) bottomBar.push(visible);
  }
  // Cap at 4
  if (bottomBar.length > 4) bottomBar.length = 4;

  const barKeys = new Set(bottomBar.map((i) => i.iconKey));
  const sheetItems = all.filter((i) => !barKeys.has(i.iconKey));
  const sheetGroups: VisibleNavGroup[] = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !barKeys.has(i.iconKey)),
    }))
    .filter((g) => g.items.length > 0);

  return {
    primary,
    more,
    bottom,
    all,
    bottomBar,
    sheetItems,
    groups,
    sheetGroups,
  };
}

// ---- Flatten all items for lookup ----
export const ALL_NAV_ITEMS: NavItemConfig[] = NAV_GROUPS.flatMap(
  (g) => g.items,
);
