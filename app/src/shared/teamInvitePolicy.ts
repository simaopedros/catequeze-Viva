/**
 * Single source of truth for team/family invite permissions.
 * Used by the server and mirrored by the UI (no divergent role lists).
 */

import { isFamilyPortalRole } from './portal';

/** Roles that may open the team area and invite (with role-specific limits). */
export const TEAM_AREA_VIEW_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'PERSONAL_OWNER',
] as const;

/** Roles considered "staff team" (not family portal). */
export const TEAM_MEMBER_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'CONTENT_REVIEWER',
  'PASTORAL_VIEWER',
  'PERSONAL_OWNER',
] as const;

/**
 * Which roles each actor role may assign (invite or promote).
 * A role can never assign a role at or above its own level.
 *
 * Lead catechist may invite another catechist or assistant (team),
 * plus guardians and catechumens (family). Assistants only family.
 */
export const ROLE_ASSIGNMENT_HIERARCHY: Record<string, string[]> = {
  SUPER_ADMIN: [
    'DIOCESE_ADMIN',
    'PARISH_COORDINATOR',
    'COMMUNITY_COORDINATOR',
    'LEAD_CATECHIST',
    'ASSISTANT_CATECHIST',
    'GUARDIAN',
    'CATECHUMEN',
    'CONTENT_REVIEWER',
    'PASTORAL_VIEWER',
  ],
  DIOCESE_ADMIN: [
    'PARISH_COORDINATOR',
    'COMMUNITY_COORDINATOR',
    'LEAD_CATECHIST',
    'ASSISTANT_CATECHIST',
    'GUARDIAN',
    'CATECHUMEN',
    'CONTENT_REVIEWER',
    'PASTORAL_VIEWER',
  ],
  PARISH_COORDINATOR: [
    'COMMUNITY_COORDINATOR',
    'LEAD_CATECHIST',
    'ASSISTANT_CATECHIST',
    'GUARDIAN',
    'CATECHUMEN',
    'CONTENT_REVIEWER',
    'PASTORAL_VIEWER',
  ],
  COMMUNITY_COORDINATOR: [
    'LEAD_CATECHIST',
    'ASSISTANT_CATECHIST',
    'GUARDIAN',
    'CATECHUMEN',
    'CONTENT_REVIEWER',
    'PASTORAL_VIEWER',
  ],
  LEAD_CATECHIST: ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN'],
  ASSISTANT_CATECHIST: ['GUARDIAN', 'CATECHUMEN'],
  PERSONAL_OWNER: ['GUARDIAN', 'CATECHUMEN'],
};

export type InviteEmailDelivery = 'sent' | 'not_configured' | 'failed';

export function normalizeInviteEmail(email: string): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function getAssignableRoles(
  actorRole: string | null | undefined,
  isPlatformAdmin: boolean,
): string[] {
  if (isPlatformAdmin || actorRole === 'SUPER_ADMIN') {
    return ROLE_ASSIGNMENT_HIERARCHY.SUPER_ADMIN;
  }
  return ROLE_ASSIGNMENT_HIERARCHY[actorRole || ''] || [];
}

export function canViewTeamArea(
  actorRole: string | null | undefined,
  isPlatformAdmin: boolean,
): boolean {
  if (isPlatformAdmin) return true;
  return (
    !!actorRole &&
    (TEAM_AREA_VIEW_ROLES as readonly string[]).includes(actorRole)
  );
}

/** Team roles that require a class when invited by a lead catechist. */
export const TEAM_ROLES_NEEDING_CLASS_FOR_LEAD = [
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
] as const;

/**
 * Resolve ClassCatechist role for an invitation.
 * Another catechist (LEAD_CATECHIST parish role) joins the class as ASSISTANT
 * collaborator and never replaces the current LEAD.
 */
export function resolveClassAssignmentRole(args: {
  parishRole: string;
  explicit?: 'LEAD' | 'ASSISTANT' | null;
}): 'LEAD' | 'ASSISTANT' | null {
  if (args.explicit === 'LEAD' || args.explicit === 'ASSISTANT') {
    // Never allow invite path to set LEAD when inviting LEAD_CATECHIST into a class
    // as collaborator — only explicit coordinator flows may set LEAD via assignLead.
    if (args.parishRole === 'LEAD_CATECHIST' && args.explicit === 'LEAD') {
      return 'ASSISTANT';
    }
    if (args.parishRole === 'ASSISTANT_CATECHIST') return 'ASSISTANT';
    return args.explicit;
  }
  if (args.parishRole === 'ASSISTANT_CATECHIST') return 'ASSISTANT';
  if (args.parishRole === 'LEAD_CATECHIST') return 'ASSISTANT';
  return null;
}

export function invitePortalPath(role: string, token: string): string {
  return `/convite/${token}`;
}

export function isTeamInviteRole(role: string): boolean {
  return !isFamilyPortalRole(role);
}

export function canInviteTeamRoles(actorRole: string | null | undefined): boolean {
  if (!actorRole) return false;
  return (
    actorRole === 'SUPER_ADMIN' ||
    actorRole === 'DIOCESE_ADMIN' ||
    actorRole === 'PARISH_COORDINATOR' ||
    actorRole === 'COMMUNITY_COORDINATOR' ||
    actorRole === 'LEAD_CATECHIST'
  );
}
