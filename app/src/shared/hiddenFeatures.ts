/**
 * End-user chrome for features that are finished but not in daily use.
 *
 * Flip a key to `false` to show that feature again. Client env can override
 * the set at build time (see readHiddenOverride). Server operations, schema
 * and routes stay registered.
 *
 * Wasp only injects client vars prefixed with REACT_APP_. VITE_HIDDEN_FEATURES
 * is also read when the bundler exposes it. "none" shows every feature.
 * A comma list replaces the default set (only those keys stay hidden).
 */

export const HIDDEN_FEATURE_KEYS = [
  "social",
  "formation",
  "officialLibrary",
  "messageCampaigns",
  "collaborativeSessions",
  "ai",
  "itinerary",
  "tasks",
  "files",
  "activities",
  "communities",
] as const;

export type HiddenFeatureKey = (typeof HIDDEN_FEATURE_KEYS)[number];

export const HIDDEN_FEATURES: Record<HiddenFeatureKey, boolean> = {
  social: true,
  formation: true,
  officialLibrary: true,
  messageCampaigns: true,
  collaborativeSessions: true,
  ai: true,
  itinerary: true,
  tasks: true,
  files: true,
  activities: true,
  communities: true,
};

/** Authenticated app home when a hidden URL is opened directly. */
export const HIDDEN_APP_REDIRECT = "/app";

const OVERRIDE_ENV_NAMES = [
  "VITE_HIDDEN_FEATURES",
  "REACT_APP_HIDDEN_FEATURES",
] as const;

type PathRule = {
  key: HiddenFeatureKey;
  prefixes: readonly string[];
  /**
   * Files stay reachable: /app/documents is the family/catechumen library,
   * not the Inscrições queue (/app/inscricoes/:id/documentos). Hide the nav
   * entry only.
   */
  redirect: boolean;
};

const PATH_RULES: readonly PathRule[] = [
  { key: "social", prefixes: ["/app/comunidade"], redirect: true },
  { key: "formation", prefixes: ["/app/formation"], redirect: true },
  {
    key: "officialLibrary",
    prefixes: ["/app/official-library"],
    redirect: true,
  },
  {
    key: "messageCampaigns",
    prefixes: ["/app/message-campaigns"],
    redirect: true,
  },
  {
    key: "collaborativeSessions",
    prefixes: ["/app/collaborative-planner"],
    redirect: true,
  },
  {
    key: "ai",
    prefixes: ["/app/ai-hub", "/app/ai-planner", "/app/my-ai-generations"],
    redirect: true,
  },
  { key: "tasks", prefixes: ["/app/tasks"], redirect: true },
  { key: "files", prefixes: ["/app/documents"], redirect: false },
  { key: "activities", prefixes: ["/app/activities"], redirect: true },
  { key: "communities", prefixes: ["/app/communities"], redirect: true },
];

/** Nav iconKey → feature. Sacramentos (sacraments) and Inscrições are absent. */
const NAV_ICON_FEATURE: Partial<Record<string, HiddenFeatureKey>> = {
  community: "social",
  formation: "formation",
  official_library: "officialLibrary",
  ai_hub: "ai",
  documents: "files",
  activities: "activities",
  communities: "communities",
};

const KEY_SET = new Set<string>(HIDDEN_FEATURE_KEYS);

export function isHiddenFeatureKey(value: string): value is HiddenFeatureKey {
  return KEY_SET.has(value);
}

function readOverrideRaw(): string | undefined {
  const metaEnv =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: Record<string, string | undefined> }).env
      : undefined;

  for (const name of OVERRIDE_ENV_NAMES) {
    const fromMeta = metaEnv?.[name];
    if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
    const fromProcess =
      typeof process !== "undefined" ? process.env?.[name] : undefined;
    if (typeof fromProcess === "string" && fromProcess.trim()) {
      return fromProcess.trim();
    }
  }
  return undefined;
}

/** `null` = use HIDDEN_FEATURES. `"none"` = show all. Otherwise the hidden set. */
export function readHiddenOverride(): Set<HiddenFeatureKey> | "none" | null {
  const raw = readOverrideRaw();
  if (!raw) return null;
  if (raw.toLowerCase() === "none") return "none";
  const keys = new Set<HiddenFeatureKey>();
  for (const part of raw.split(",")) {
    const token = part.trim();
    if (isHiddenFeatureKey(token)) keys.add(token);
  }
  return keys;
}

export function isFeatureHidden(key: HiddenFeatureKey): boolean {
  const override = readHiddenOverride();
  if (override === "none") return false;
  if (override) return override.has(key);
  return HIDDEN_FEATURES[key];
}

export function normalizeAppPath(pathname: string): string {
  const path = pathname.split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Class formation lives under Inscrições; the rest of /app/inscricoes stays. */
function isClassFormationPath(path: string): boolean {
  return /^\/app\/inscricoes\/[^/]+\/formacao(?:\/.*)?$/.test(path);
}

export function featureForPath(pathname: string): HiddenFeatureKey | null {
  const path = normalizeAppPath(pathname);
  if (isClassFormationPath(path)) return "formation";
  for (const rule of PATH_RULES) {
    if (rule.prefixes.some((prefix) => matchesPrefix(path, prefix))) {
      return rule.key;
    }
  }
  return null;
}

export function isHiddenFeaturePath(pathname: string): boolean {
  const key = featureForPath(pathname);
  return key !== null && isFeatureHidden(key);
}

export function shouldRedirectHiddenAppPath(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  if (isClassFormationPath(path)) return isFeatureHidden("formation");
  for (const rule of PATH_RULES) {
    if (!rule.redirect) continue;
    if (!rule.prefixes.some((prefix) => matchesPrefix(path, prefix))) continue;
    return isFeatureHidden(rule.key);
  }
  return false;
}

export function shouldShowConfiguredNavItem(item: {
  to: string;
  iconKey: string;
}): boolean {
  const byIcon = NAV_ICON_FEATURE[item.iconKey];
  if (byIcon && isFeatureHidden(byIcon)) return false;
  const byPath = featureForPath(item.to);
  if (byPath && isFeatureHidden(byPath)) return false;
  return true;
}

export function filterHiddenNavItems<T extends { to: string; iconKey: string }>(
  items: T[],
): T[] {
  return items.filter((item) => shouldShowConfiguredNavItem(item));
}

export function isHiddenSearchHit(hit: {
  route?: string;
  module?: string;
}): boolean {
  if (hit.module === "document" && isFeatureHidden("files")) return true;
  if (hit.module === "community" && isFeatureHidden("communities")) return true;
  if (typeof hit.route === "string" && shouldRedirectHiddenAppPath(hit.route)) {
    return true;
  }
  return false;
}
