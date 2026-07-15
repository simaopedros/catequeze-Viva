/**
 * Family portal surface resolution for server operations.
 *
 * Wasp operation middleware only injects `{ user, entities }` — NOT `req`.
 * Host-based detection via context.req therefore rarely works for queries/actions.
 * Prefer: explicit args.surface === 'PORTAL' + pure family membership roles.
 */
import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';
import { isFamilyPortalHost, hostFromRequest } from '../../shared/portal';
import {
  isFamilyPortalRole,
  isStaffPortalRole,
  rolesAreFamilyOnly,
  resolvePortalSurfaceFromRoles,
  type PortalSurface,
  STAFF_PORTAL_ROLES,
} from '../../shared/familySurface';

export {
  isFamilyPortalRole,
  isStaffPortalRole,
  rolesAreFamilyOnly,
  STAFF_PORTAL_ROLES,
  type PortalSurface,
};

/** Best-effort host detection when req exists (HTTP APIs). */
export function detectFamilyHostFromContext(context: any): boolean {
  const req = context?.req ?? context?.request ?? null;
  if (!req) return false;
  if (isFamilyPortalHost(hostFromRequest(req))) return true;
  try {
    const headers = req.headers || {};
    const origin = String(headers.origin || headers.Origin || '');
    if (origin && isFamilyPortalHost(new URL(origin).hostname)) return true;
    const referer = String(headers.referer || headers.Referer || '');
    if (referer && isFamilyPortalHost(new URL(referer).hostname)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function resolvePortalSurface(opts: {
  context: any;
  roles: string[];
  surface?: string | null;
}): PortalSurface {
  return resolvePortalSurfaceFromRoles(
    opts.roles,
    opts.surface,
    detectFamilyHostFromContext(opts.context),
  );
}

export function isFamilySurface(opts: {
  context: any;
  roles: string[];
  surface?: string | null;
}): boolean {
  return resolvePortalSurface(opts) === 'PORTAL';
}

export async function loadActiveRoles(
  context: any,
  parishId?: string | null,
): Promise<string[]> {
  if (!context.user?.id) return [];
  if (context.user.isAdmin && !parishId) return ['SUPER_ADMIN'];
  const rows = await context.entities.Membership.findMany({
    where: {
      userId: context.user.id,
      status: MembershipStatus.ACTIVE,
      ...(parishId ? { parishId } : {}),
    },
    select: { role: true },
  });
  const roles = rows.map((r: { role: string }) => r.role);

  // Personal workspace owners may lack a Membership row or only hold family
  // roles on other parishes — still treat ownership as staff for that parish.
  if (parishId) {
    const personal = await context.entities.Parish.findFirst({
      where: {
        id: parishId,
        ownerId: context.user.id,
        type: 'PERSONAL',
      },
      select: { id: true },
    });
    if (personal && !roles.includes('PERSONAL_OWNER')) {
      roles.push('PERSONAL_OWNER');
    }
  } else {
    const ownsPersonal = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (ownsPersonal && !roles.includes('PERSONAL_OWNER')) {
      roles.push('PERSONAL_OWNER');
    }
  }

  return roles;
}

export async function assertStaffOperation(
  context: any,
  opts?: {
    parishId?: string | null;
    surface?: string | null;
    message?: string;
  },
): Promise<void> {
  if (!context.user) throw new HttpError(401);
  if (context.user.isAdmin) return;

  const roles = await loadActiveRoles(context, opts?.parishId);
  if (isFamilySurface({ context, roles, surface: opts?.surface })) {
    throw new HttpError(
      403,
      opts?.message ||
        'Esta operação não está disponível no Portal da Família.',
    );
  }

  if (rolesAreFamilyOnly(roles)) {
    throw new HttpError(
      403,
      opts?.message ||
        'Apenas a equipe pastoral pode realizar esta operação.',
    );
  }

  if (!roles.some(isStaffPortalRole)) {
    throw new HttpError(
      403,
      opts?.message ||
        'Apenas a equipe pastoral pode realizar esta operação.',
    );
  }
}

export async function assertNotFamilyOnlyUser(
  context: any,
  message?: string,
): Promise<void> {
  if (!context.user) throw new HttpError(401);
  if (context.user.isAdmin) return;
  const roles = await loadActiveRoles(context);
  if (rolesAreFamilyOnly(roles)) {
    throw new HttpError(
      403,
      message ||
        'Contas do Portal da Família não têm acesso a esta funcionalidade.',
    );
  }
}
