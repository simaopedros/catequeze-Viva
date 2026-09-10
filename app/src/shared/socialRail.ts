import { getVisibleNavigation } from "./navigation";

export type SocialRailToolId =
  | "classes"
  | "library"
  | "bible"
  | "catechism"
  | "messages";

export const SOCIAL_RAIL_TOOL_PATHS: Record<SocialRailToolId, string> = {
  classes: "/app/classes",
  library: "/app/content-library",
  bible: "/app/bible",
  catechism: "/app/catechism",
  messages: "/app/messages",
};

const DEFAULT_TOOLS: SocialRailToolId[] = [
  "classes",
  "library",
  "bible",
  "messages",
];

const TOOL_ORDER: SocialRailToolId[] = [
  "classes",
  "library",
  "bible",
  "catechism",
  "messages",
];

/**
 * Pastoral shortcuts in the Comunidade rail.
 * Guests see the staff set (links go to login). Signed-in users only see
 * destinations their role can open — families never land on Turmas/Biblioteca.
 */
export function getSocialRailToolIds(options: {
  signedIn: boolean;
  role?: string;
  isAdmin?: boolean;
}): SocialRailToolId[] {
  if (!options.signedIn || !options.role) {
    return DEFAULT_TOOLS;
  }

  const visible = new Set(
    getVisibleNavigation({
      role: options.role,
      isAdmin: Boolean(options.isAdmin),
    }).all.map((item) => item.to),
  );

  return TOOL_ORDER.filter((id) => visible.has(SOCIAL_RAIL_TOOL_PATHS[id]));
}
