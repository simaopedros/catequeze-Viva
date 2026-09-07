/**
 * Hierarchical pastoral resources.
 *
 * Diocese → Parish → Community → Class. A resource is born at one owner
 * level and may cascade with an inheritance policy. Local copies freeze
 * when adapted; inherited rows keep receiving upstream updates.
 */

export const RESOURCE_OWNER_TYPES = [
  "PLATFORM",
  "DIOCESE",
  "PARISH",
  "COMMUNITY",
  "CLASS",
] as const;

export type ResourceOwnerType = (typeof RESOURCE_OWNER_TYPES)[number];

export const INHERITANCE_POLICIES = [
  "LOCKED",
  "REQUIRED_EXTENDABLE",
  "SUGGESTED",
  "LOCAL",
] as const;

export type InheritancePolicy = (typeof INHERITANCE_POLICIES)[number];

export const ADOPTION_STATUSES = [
  "INHERITED",
  "ADAPTED",
  "DISMISSED",
] as const;

export type AdoptionStatus = (typeof ADOPTION_STATUSES)[number];

export const RESOURCE_KINDS = [
  "CALENDAR",
  "CONTENT",
  "OFFICIAL",
  "ANNOUNCEMENT",
  "ITINERARY",
  "JOURNEY_TEMPLATE",
  "MESSAGE_TEMPLATE",
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const OFFICIAL_RESOURCE_KINDS = [
  "DIRECTORY",
  "SUBSIDY",
  "CIRCULAR",
  "FORM_TEMPLATE",
  "POLICY",
  "RITE",
  "HYMN",
  "OTHER",
] as const;

export type OfficialResourceKind = (typeof OFFICIAL_RESOURCE_KINDS)[number];

export type InheritanceContext = {
  ownerType: ResourceOwnerType;
  ownerId: string;
  dioceseId?: string | null;
  parishId?: string | null;
  communityId?: string | null;
  classId?: string | null;
};

export type OriginAnnotation = {
  ownerType: ResourceOwnerType;
  ownerId: string;
  policy: InheritancePolicy;
  inherited: boolean;
  adoptionStatus: AdoptionStatus | null;
  sourceId: string | null;
  labelKey: string;
};

export type CalendarConflict = {
  dateKey: string;
  inherited: { id: string; name: string; ownerType: ResourceOwnerType };
  local: { id: string; name: string; kind: "meeting" | "event" };
};

const OWNER_RANK: Record<ResourceOwnerType, number> = {
  PLATFORM: 0,
  DIOCESE: 1,
  PARISH: 2,
  COMMUNITY: 3,
  CLASS: 4,
};

const PUBLISH_ROLES: Record<ResourceOwnerType, string[]> = {
  PLATFORM: ["SUPER_ADMIN"],
  DIOCESE: ["SUPER_ADMIN", "DIOCESE_ADMIN"],
  PARISH: [
    "SUPER_ADMIN",
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "PERSONAL_OWNER",
  ],
  COMMUNITY: [
    "SUPER_ADMIN",
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "COMMUNITY_COORDINATOR",
    "PERSONAL_OWNER",
  ],
  CLASS: [
    "SUPER_ADMIN",
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "COMMUNITY_COORDINATOR",
    "PERSONAL_OWNER",
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
  ],
};

export function ownerTypeFromWorkspace(
  workspaceType: string | null | undefined,
): ResourceOwnerType {
  switch (workspaceType) {
    case "DIOCESE":
      return "DIOCESE";
    case "COMMUNITY":
      return "COMMUNITY";
    case "PERSONAL":
      return "PARISH";
    case "PARISH":
      return "PARISH";
    default:
      return "PARISH";
  }
}

export function originLabelKey(ownerType: ResourceOwnerType): string {
  switch (ownerType) {
    case "PLATFORM":
      return "origin.platform";
    case "DIOCESE":
      return "origin.diocese";
    case "PARISH":
      return "origin.parish";
    case "COMMUNITY":
      return "origin.community";
    case "CLASS":
      return "origin.class";
  }
}

export function defaultPolicyFor(
  kind: ResourceKind,
  ownerType: ResourceOwnerType,
): InheritancePolicy {
  if (ownerType === "CLASS") return "LOCAL";
  if (kind === "CALENDAR") {
    return ownerType === "DIOCESE" || ownerType === "PARISH"
      ? "REQUIRED_EXTENDABLE"
      : "SUGGESTED";
  }
  if (kind === "ANNOUNCEMENT" || kind === "ITINERARY") {
    return ownerType === "DIOCESE" ? "REQUIRED_EXTENDABLE" : "SUGGESTED";
  }
  if (kind === "OFFICIAL") {
    return ownerType === "DIOCESE" ? "LOCKED" : "SUGGESTED";
  }
  if (kind === "CONTENT" || kind === "JOURNEY_TEMPLATE") return "SUGGESTED";
  if (kind === "MESSAGE_TEMPLATE") return "SUGGESTED";
  return "LOCAL";
}

export function cascadesToChildren(policy: InheritancePolicy): boolean {
  return policy !== "LOCAL";
}

export function shouldPropagateUpdate(
  adoptionStatus: AdoptionStatus | null | undefined,
): boolean {
  return !adoptionStatus || adoptionStatus === "INHERITED";
}

export function canPublishAt(
  role: string,
  ownerType: ResourceOwnerType,
  isPlatformAdmin = false,
): boolean {
  if (isPlatformAdmin) return true;
  return PUBLISH_ROLES[ownerType].includes(role);
}

export function isUpstreamOf(
  maybeParent: ResourceOwnerType,
  child: ResourceOwnerType,
): boolean {
  return OWNER_RANK[maybeParent] < OWNER_RANK[child];
}

export function canEditResource(args: {
  role: string;
  actorOwnerType: ResourceOwnerType;
  resourceOwnerType: ResourceOwnerType;
  policy: InheritancePolicy;
  isCreator?: boolean;
  isPlatformAdmin?: boolean;
}): boolean {
  if (args.isPlatformAdmin) return true;
  if (args.resourceOwnerType === args.actorOwnerType) {
    return canPublishAt(args.role, args.actorOwnerType);
  }
  if (isUpstreamOf(args.resourceOwnerType, args.actorOwnerType)) {
    if (args.policy === "LOCKED") return false;
    if (args.policy === "REQUIRED_EXTENDABLE") return false;
    if (args.policy === "SUGGESTED") return false;
    return false;
  }
  return Boolean(args.isCreator && canPublishAt(args.role, args.actorOwnerType));
}

export function canAdaptResource(policy: InheritancePolicy): boolean {
  return policy === "SUGGESTED" || policy === "REQUIRED_EXTENDABLE";
}

export function canDismissResource(policy: InheritancePolicy): boolean {
  return policy === "SUGGESTED";
}

/**
 * Ancestor owners that should be unioned when listing resources for a viewer.
 * LOCAL rows from ancestors are never included (caller filters by policy).
 */
export function ancestorOwners(
  ctx: InheritanceContext,
): { ownerType: ResourceOwnerType; ownerId: string }[] {
  const out: { ownerType: ResourceOwnerType; ownerId: string }[] = [];
  if (ctx.dioceseId && ctx.ownerType !== "DIOCESE") {
    out.push({ ownerType: "DIOCESE", ownerId: ctx.dioceseId });
  }
  if (ctx.parishId && OWNER_RANK[ctx.ownerType] > OWNER_RANK.PARISH) {
    out.push({ ownerType: "PARISH", ownerId: ctx.parishId });
  }
  if (ctx.communityId && OWNER_RANK[ctx.ownerType] > OWNER_RANK.COMMUNITY) {
    out.push({ ownerType: "COMMUNITY", ownerId: ctx.communityId });
  }
  return out;
}

export function annotateOrigin(args: {
  ownerType: ResourceOwnerType;
  ownerId: string;
  policy: InheritancePolicy;
  viewerOwnerType: ResourceOwnerType;
  adoptionStatus?: AdoptionStatus | null;
  sourceId?: string | null;
}): OriginAnnotation {
  const inherited = isUpstreamOf(args.ownerType, args.viewerOwnerType);
  return {
    ownerType: args.ownerType,
    ownerId: args.ownerId,
    policy: args.policy,
    inherited,
    adoptionStatus: args.adoptionStatus ?? (inherited ? "INHERITED" : null),
    sourceId: args.sourceId ?? null,
    labelKey: originLabelKey(args.ownerType),
  };
}

export function toDateKey(value: Date | string): string {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
    return parsed.toISOString().slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

/**
 * Same-day overlap between cascaded (diocese/parish) events and local
 * meetings or events. Alert only — never a hard block.
 */
export function findCalendarConflicts(
  inheritedEvents: Array<{
    id: string;
    name: string;
    date: Date | string;
    ownerType: ResourceOwnerType;
    inheritancePolicy?: InheritancePolicy;
  }>,
  localItems: Array<{
    id: string;
    name: string;
    date: Date | string;
    kind: "meeting" | "event";
  }>,
): CalendarConflict[] {
  const relevant = inheritedEvents.filter((event) => {
    const policy = event.inheritancePolicy ?? "REQUIRED_EXTENDABLE";
    return policy === "LOCKED" || policy === "REQUIRED_EXTENDABLE";
  });
  const byDay = new Map<string, typeof relevant>();
  for (const event of relevant) {
    const key = toDateKey(event.date);
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }
  const conflicts: CalendarConflict[] = [];
  for (const local of localItems) {
    const key = toDateKey(local.date);
    const inherited = byDay.get(key);
    if (!inherited) continue;
    for (const event of inherited) {
      if (event.id === local.id) continue;
      conflicts.push({
        dateKey: key,
        inherited: {
          id: event.id,
          name: event.name,
          ownerType: event.ownerType,
        },
        local: { id: local.id, name: local.name, kind: local.kind },
      });
    }
  }
  return conflicts;
}

export function visibilityScopeForOwner(
  ownerType: ResourceOwnerType,
): "GLOBAL" | "DIOCESE" | "PARISH" | "COMMUNITY" | "CLASS" {
  switch (ownerType) {
    case "PLATFORM":
      return "GLOBAL";
    case "DIOCESE":
      return "DIOCESE";
    case "COMMUNITY":
      return "COMMUNITY";
    case "CLASS":
      return "CLASS";
    default:
      return "PARISH";
  }
}

export function ownerIdFromContext(ctx: InheritanceContext): string {
  switch (ctx.ownerType) {
    case "DIOCESE":
      return ctx.dioceseId || ctx.ownerId;
    case "PARISH":
      return ctx.parishId || ctx.ownerId;
    case "COMMUNITY":
      return ctx.communityId || ctx.ownerId;
    case "CLASS":
      return ctx.classId || ctx.ownerId;
    default:
      return ctx.ownerId;
  }
}
