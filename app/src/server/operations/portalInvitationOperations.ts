/**
 * PortalInvitation APIs — create / list / get / accept / resend / revoke.
 * Token plaintext is returned only once on create/resend for email/WhatsApp delivery.
 */
import { createHash, randomBytes, randomUUID } from 'crypto';
import { HttpError, prisma } from 'wasp/server';
import { requireAuth, writeAuditLog, getDioceseParishIds } from '../auth/helpers';
import { logger } from '../logger';
import { deliverInviteEmail } from '../jobs/inviteEmailUtils';
import { familyPortalUrl } from '../../shared/portal';
import {
  assertEmailVerifiedForPortalAccept,
  normalizeEmail,
} from '../auth/emailVerification';

// ── Rate limits (memberOperations pattern) ─────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60_000;
const ACCEPT_RATE_LIMIT_MAX = 20;

function checkRateLimit(key: string, max = RATE_LIMIT_MAX): void {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (entry && entry.resetAt > now) {
    if (entry.count >= max) {
      throw new HttpError(429, 'Muitas tentativas. Tente novamente em breve.');
    }
    entry.count++;
  } else {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  }
  if (rateLimitMap.size > 1000) {
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt <= now) rateLimitMap.delete(k);
    }
  }
}

function clientIp(context: any): string {
  return (
    (context.req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (context.req?.socket?.remoteAddress as string) ||
    'unknown'
  );
}

// ── Token helpers ──────────────────────────────────────────────────────────

export function hashPortalInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function generatePortalInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

function defaultExpiry(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visible = name.length > 2 ? 2 : 1;
  return name.slice(0, visible) + '***' + '@' + domain;
}

function roleLabel(role: string): string {
  if (role === 'GUARDIAN') return 'Responsável';
  if (role === 'CATECHUMEN') return 'Catequizando';
  return role;
}

function whatsappUrl(token: string, parishName: string): string {
  const link = familyPortalUrl(`/convite/${token}`);
  const text = encodeURIComponent(
    `Você foi convidado(a) para o portal da família de "${parishName}". Acesse: ${link}`,
  );
  return `https://wa.me/?text=${text}`;
}

/** birthDate null or age < 18 → minor */
export function isMinor(birthDate: Date | string | null | undefined): boolean {
  if (birthDate == null) return true;
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(d.getTime())) return true;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 18;
}

/** Stub reads MinorPortalConsent table; empty table → false (safe until PR6 grants). */
export async function hasActiveMinorPortalConsent(
  context: any,
  catechumenProfileId: string,
): Promise<boolean> {
  try {
    const entities = context?.entities?.MinorPortalConsent;
    if (entities?.findFirst) {
      const row = await entities.findFirst({
        where: {
          catechumenProfileId,
          revokedAt: null,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      return !!row;
    }
    const row = await prisma.minorPortalConsent.findFirst({
      where: {
        catechumenProfileId,
        revokedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    return !!row;
  } catch {
    return false;
  }
}

// ── Inviter auth (staff who can invite family today) ───────────────────────

const ALLOWED_INVITER_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
];

const ROLE_ASSIGNMENT_HIERARCHY: Record<string, string[]> = {
  SUPER_ADMIN: ['GUARDIAN', 'CATECHUMEN'],
  DIOCESE_ADMIN: ['GUARDIAN', 'CATECHUMEN'],
  PARISH_COORDINATOR: ['GUARDIAN', 'CATECHUMEN'],
  COMMUNITY_COORDINATOR: ['GUARDIAN', 'CATECHUMEN'],
  LEAD_CATECHIST: ['GUARDIAN', 'CATECHUMEN'],
  ASSISTANT_CATECHIST: ['GUARDIAN', 'CATECHUMEN'],
  PERSONAL_OWNER: ['GUARDIAN', 'CATECHUMEN'],
};

async function resolvePortalInviterRole(
  context: any,
  parishId: string,
): Promise<string> {
  if (context.user.isAdmin) return 'SUPER_ADMIN';

  const isPersonalOwner = await context.entities.Parish.findFirst({
    where: { id: parishId, ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (isPersonalOwner) return 'PERSONAL_OWNER';

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, parishId, status: 'ACTIVE' },
    select: { role: true },
  });
  const staff = memberships.find((m: any) => ALLOWED_INVITER_ROLES.includes(m.role));
  if (staff) return staff.role;

  const dioceseMembership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: 'ACTIVE', role: 'DIOCESE_ADMIN' },
    select: { parishId: true },
  });
  if (dioceseMembership) {
    const dioceseParishIds = await getDioceseParishIds(context);
    if (dioceseParishIds.includes(parishId)) return 'DIOCESE_ADMIN';
  }

  throw new HttpError(403, 'Apenas coordenadores e catequistas podem convidar para o portal.');
}

function assertCanAssignPortalRole(inviterRole: string, role: string, isAdmin: boolean) {
  const allowed =
    isAdmin || inviterRole === 'SUPER_ADMIN'
      ? ROLE_ASSIGNMENT_HIERARCHY.SUPER_ADMIN
      : ROLE_ASSIGNMENT_HIERARCHY[inviterRole] || [];
  if (!allowed.includes(role)) {
    throw new HttpError(403, `Você não tem permissão para atribuir o papel "${role}".`);
  }
}

function toListDto(inv: any) {
  return {
    id: inv.id,
    parishId: inv.parishId,
    communityId: inv.communityId ?? null,
    householdId: inv.householdId ?? null,
    role: inv.role,
    guardianProfileId: inv.guardianProfileId ?? null,
    catechumenProfileId: inv.catechumenProfileId ?? null,
    emailMasked: maskEmail(inv.emailNormalized || ''),
    status: inv.status,
    expiresAt: inv.expiresAt?.toISOString?.() ?? inv.expiresAt ?? null,
    acceptedAt: inv.acceptedAt?.toISOString?.() ?? inv.acceptedAt ?? null,
    lastSentAt: inv.lastSentAt?.toISOString?.() ?? inv.lastSentAt ?? null,
    resendCount: inv.resendCount ?? 0,
    createdAt: inv.createdAt?.toISOString?.() ?? inv.createdAt ?? null,
    parishName: inv.parish?.name ?? null,
    profileDisplayName: inv.profileDisplayName ?? null,
    // Never expose token / tokenHash
  };
}

async function profileDisplayName(
  context: any,
  inv: { role: string; guardianProfileId?: string | null; catechumenProfileId?: string | null },
): Promise<string | null> {
  if (inv.role === 'GUARDIAN' && inv.guardianProfileId) {
    const g = await context.entities.GuardianProfile.findUnique({
      where: { id: inv.guardianProfileId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!g) return null;
    const name = [g.firstName, g.lastName].filter(Boolean).join(' ').trim();
    return name || g.email || null;
  }
  if (inv.role === 'CATECHUMEN' && inv.catechumenProfileId) {
    const c = await context.entities.CatechumenProfile.findUnique({
      where: { id: inv.catechumenProfileId },
      select: { firstName: true, lastName: true },
    });
    if (!c) return null;
    return [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || null;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// createPortalInvitation
// ═══════════════════════════════════════════════════════════════════════════

export const createPortalInvitation = async (
  args: {
    parishId: string;
    role: 'GUARDIAN' | 'CATECHUMEN';
    email: string;
    guardianProfileId?: string;
    catechumenProfileId?: string;
    communityId?: string;
    householdId?: string;
  },
  context: any,
) => {
  requireAuth(context.user);
  // In-memory rate limit per staff user+parish (not shared across Node instances).
  checkRateLimit(`create-portal-inv:${context.user.id}:${args.parishId}`, RATE_LIMIT_MAX);

  if (!args.parishId || !args.role || !args.email) {
    throw new HttpError(400, 'parishId, role e email são obrigatórios.');
  }
  if (args.role !== 'GUARDIAN' && args.role !== 'CATECHUMEN') {
    throw new HttpError(400, 'role deve ser GUARDIAN ou CATECHUMEN.');
  }

  const inviterRole = await resolvePortalInviterRole(context, args.parishId);
  assertCanAssignPortalRole(inviterRole, args.role, !!context.user.isAdmin);

  const emailNormalized = normalizeEmail(args.email);
  if (!emailNormalized.includes('@')) {
    throw new HttpError(400, 'Email inválido.');
  }

  let guardianProfileId: string | null = null;
  let catechumenProfileId: string | null = null;
  let householdId: string | null = args.householdId || null;
  let communityId: string | null = args.communityId || null;

  if (args.role === 'GUARDIAN') {
    if (!args.guardianProfileId) {
      throw new HttpError(400, 'guardianProfileId é obrigatório para convite GUARDIAN.');
    }
    const profile = await context.entities.GuardianProfile.findUnique({
      where: { id: args.guardianProfileId },
      include: { household: { select: { id: true, parishId: true, communityId: true } } },
    });
    if (!profile) throw new HttpError(404, 'Perfil de responsável não encontrado.');
    if (!profile.householdId) {
      throw new HttpError(400, 'HOUSEHOLD_REQUIRED');
    }
    // Hard tenant check: household must be attached to the invite parish.
    if (!profile.household?.parishId || profile.household.parishId !== args.parishId) {
      throw new HttpError(400, 'Perfil não pertence a esta paróquia.');
    }
    guardianProfileId = profile.id;
    householdId = profile.householdId;
    if (!communityId && profile.household?.communityId) {
      communityId = profile.household.communityId;
    }
  } else {
    if (!args.catechumenProfileId) {
      throw new HttpError(400, 'catechumenProfileId é obrigatório para convite CATECHUMEN.');
    }
    const profile = await context.entities.CatechumenProfile.findUnique({
      where: { id: args.catechumenProfileId },
      select: {
        id: true,
        householdId: true,
        parishId: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        household: { select: { parishId: true } },
      },
    });
    if (!profile) throw new HttpError(404, 'Perfil de catequizando não encontrado.');
    // Hard tenant check: catechumen parishId or household.parishId must match.
    const profileParish =
      profile.parishId || (profile as any).household?.parishId || null;
    if (!profileParish || profileParish !== args.parishId) {
      throw new HttpError(400, 'Perfil não pertence a esta paróquia.');
    }
    catechumenProfileId = profile.id;
    if (!householdId) householdId = profile.householdId || null;

    // EMAIL_ROLE_CONFLICT: same email already ACTIVE GUARDIAN in parish
    const existingUser = await context.entities.User.findUnique({
      where: { email: emailNormalized },
      select: { id: true },
    });
    if (existingUser) {
      const guardianMem = await context.entities.Membership.findFirst({
        where: {
          userId: existingUser.id,
          parishId: args.parishId,
          role: 'GUARDIAN',
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (guardianMem) {
        throw new HttpError(409, 'EMAIL_ROLE_CONFLICT', { code: 'EMAIL_ROLE_CONFLICT' });
      }
    }

    // Another PENDING/ACCEPTED CATECHUMEN invite for same email + different profile
    const conflicting = await context.entities.PortalInvitation.findFirst({
      where: {
        emailNormalized,
        parishId: args.parishId,
        role: 'CATECHUMEN',
        status: { in: ['PENDING', 'ACCEPTED'] },
        NOT: { catechumenProfileId },
      },
      select: { id: true, catechumenProfileId: true },
    });
    if (conflicting) {
      throw new HttpError(409, 'EMAIL_ROLE_CONFLICT', {
        code: 'EMAIL_ROLE_CONFLICT',
        existingInvitationId: conflicting.id,
      });
    }
  }

  if (args.communityId) {
    const community = await context.entities.Community.findUnique({
      where: { id: args.communityId },
      select: { parishId: true },
    });
    if (!community || community.parishId !== args.parishId) {
      throw new HttpError(400, 'Comunidade não pertence a esta paróquia.');
    }
  }

  // Revoke prior PENDING invites for the same target profile
  const revokeWhere: any = {
    parishId: args.parishId,
    status: 'PENDING',
  };
  if (args.role === 'GUARDIAN') revokeWhere.guardianProfileId = guardianProfileId;
  else revokeWhere.catechumenProfileId = catechumenProfileId;

  await context.entities.PortalInvitation.updateMany({
    where: revokeWhere,
    data: { status: 'REVOKED' },
  });

  const token = generatePortalInviteToken();
  const tokenHash = hashPortalInviteToken(token);
  const expiresAt = defaultExpiry();
  const now = new Date();

  const created = await context.entities.PortalInvitation.create({
    data: {
      id: randomUUID(),
      parishId: args.parishId,
      communityId,
      householdId,
      role: args.role,
      guardianProfileId,
      catechumenProfileId,
      emailNormalized,
      tokenHash,
      status: 'PENDING',
      invitedById: context.user.id,
      expiresAt,
      lastSentAt: now,
      resendCount: 0,
      updatedAt: now,
    },
  });

  const parish = await context.entities.Parish.findUnique({
    where: { id: args.parishId },
    select: { name: true },
  });
  const location = parish?.name || 'a paróquia';

  try {
    if (process.env.VITEST || process.env.NODE_ENV === 'test' || !process.env.RESEND_API_KEY) {
      logger.warn('[portalInvitation] RESEND_API_KEY ausente; convite salvo sem envio de email.', {
        to: emailNormalized,
      });
    } else {
      await deliverInviteEmail(
        { to: emailNormalized, location, role: args.role, token },
        context,
      );
    }
  } catch (error) {
    logger.error('[portalInvitation] Erro ao enviar email de convite', { error: String(error) });
  }

  await writeAuditLog(context, 'CREATE', 'PortalInvitation', created.id, {
    operation: 'PORTAL_INVITE_CREATE',
    parishId: args.parishId,
    role: args.role,
    emailNormalized,
    guardianProfileId,
    catechumenProfileId,
  });

  return {
    ...toListDto(created),
    parishName: location,
    profileDisplayName: await profileDisplayName(context, created),
    // Raw token once for email/WhatsApp
    token,
    whatsappUrl: whatsappUrl(token, location),
    inviteUrl: familyPortalUrl(`/convite/${token}`),
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// listPortalInvitations
// ═══════════════════════════════════════════════════════════════════════════

export const listPortalInvitations = async (
  args: { parishId: string; status?: string; take?: number; skip?: number },
  context: any,
) => {
  requireAuth(context.user);
  if (!args.parishId) throw new HttpError(400, 'parishId é obrigatório.');

  await resolvePortalInviterRole(context, args.parishId);

  const where: any = { parishId: args.parishId };
  if (args.status) where.status = args.status;

  const take = Math.min(args.take ?? 50, 100);
  const skip = args.skip ?? 0;

  const rows = await context.entities.PortalInvitation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    skip,
    include: { parish: { select: { name: true } } },
  });

  const result = [];
  for (const inv of rows) {
    const dto = toListDto(inv);
    dto.profileDisplayName = await profileDisplayName(context, inv);
    // Ensure secrets never leak
    delete (dto as any).token;
    delete (dto as any).tokenHash;
    result.push(dto);
  }
  return result;
};

// ═══════════════════════════════════════════════════════════════════════════
// getPortalInvitation (public, rate-limited)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Public get: **requires token** (secret possession).
 * invitationId alone is not accepted on this public query — staff use list;
 * authenticated invitees use accept with invitationId after email match.
 */
export const getPortalInvitation = async (
  args: { token?: string; invitationId?: string },
  context: any,
) => {
  checkRateLimit(`get-portal-inv:${clientIp(context)}`);

  if (!args.token) {
    throw new HttpError(400, 'token é obrigatório.');
  }

  const tokenHash = hashPortalInviteToken(args.token);
  const inv = await context.entities.PortalInvitation.findUnique({
    where: { tokenHash },
    include: {
      parish: { select: { id: true, name: true, type: true } },
    },
  });

  if (!inv) throw new HttpError(404, 'Convite não encontrado.');
  // If invitationId is also provided, ensure it matches the token target (no id-only leak path).
  if (args.invitationId && args.invitationId !== inv.id) {
    throw new HttpError(404, 'Convite não encontrado.');
  }

  if (inv.status === 'PENDING' && inv.expiresAt && new Date() > new Date(inv.expiresAt)) {
    try {
      await context.entities.PortalInvitation.update({
        where: { id: inv.id },
        data: { status: 'EXPIRED' },
      });
    } catch {
      /* best-effort */
    }
    inv.status = 'EXPIRED';
  }

  let requiresMinorConsent = false;
  let profileDisplayNameValue: string | null = null;
  if (inv.role === 'CATECHUMEN' && inv.catechumenProfileId) {
    const profile = await context.entities.CatechumenProfile.findUnique({
      where: { id: inv.catechumenProfileId },
      select: { firstName: true, lastName: true, birthDate: true },
    });
    if (profile) {
      profileDisplayNameValue = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
      if (isMinor(profile.birthDate)) {
        const hasConsent = await hasActiveMinorPortalConsent(context, inv.catechumenProfileId);
        requiresMinorConsent = !hasConsent;
      }
    }
  } else if (inv.role === 'GUARDIAN' && inv.guardianProfileId) {
    profileDisplayNameValue = await profileDisplayName(context, inv);
  }

  const existingUser = await context.entities.User.findUnique({
    where: { email: inv.emailNormalized },
    select: { id: true },
  });

  return {
    invitationId: inv.id,
    role: inv.role,
    roleLabel: roleLabel(inv.role),
    parishId: inv.parishId,
    parishName: inv.parish?.name ?? null,
    parishType: inv.parish?.type ?? null,
    profileDisplayName: profileDisplayNameValue,
    emailMasked: maskEmail(inv.emailNormalized || ''),
    expiresAt: inv.expiresAt?.toISOString?.() ?? inv.expiresAt ?? null,
    status: inv.status,
    hasAccount: !!existingUser,
    requiresMinorConsent,
    // Explicitly omit: token, tokenHash, email plaintext
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// acceptPortalInvitation
// ═══════════════════════════════════════════════════════════════════════════

export const acceptPortalInvitation = async (
  args: { invitationId?: string; token?: string },
  context: any,
) => {
  requireAuth(context.user);
  checkRateLimit(`accept-portal-inv:${context.user.id}`, ACCEPT_RATE_LIMIT_MAX);

  if (!args.invitationId && !args.token) {
    throw new HttpError(400, 'invitationId ou token é obrigatório.');
  }

  await assertEmailVerifiedForPortalAccept(context.user);

  const userEmail = context.user.email ? normalizeEmail(context.user.email) : '';
  if (!userEmail) {
    throw new HttpError(403, 'EMAIL_NOT_VERIFIED', { code: 'EMAIL_NOT_VERIFIED' });
  }

  const tokenHash = args.token ? hashPortalInviteToken(args.token) : null;

  // Pre-load for minor consent check outside transaction path that needs zero writes
  let invPre: any = null;
  if (args.invitationId) {
    invPre = await context.entities.PortalInvitation.findUnique({
      where: { id: args.invitationId },
    });
  } else if (tokenHash) {
    invPre = await context.entities.PortalInvitation.findUnique({
      where: { tokenHash },
    });
  }

  if (!invPre) throw new HttpError(404, 'Convite não encontrado.');

  // Idempotent success
  if (invPre.status === 'ACCEPTED' && invPre.acceptedById === context.user.id) {
    return {
      success: true,
      idempotent: true,
      invitationId: invPre.id,
      parishId: invPre.parishId,
      role: invPre.role,
      status: 'ACCEPTED',
    };
  }
  if (invPre.status === 'ACCEPTED') {
    throw new HttpError(409, 'ALREADY_USED', { code: 'ALREADY_USED' });
  }
  if (invPre.status === 'REVOKED') {
    throw new HttpError(410, 'REVOKED', { code: 'REVOKED' });
  }
  if (invPre.expiresAt && new Date() > new Date(invPre.expiresAt)) {
    await context.entities.PortalInvitation.update({
      where: { id: invPre.id },
      data: { status: 'EXPIRED' },
    });
    throw new HttpError(410, 'EXPIRED', { code: 'EXPIRED' });
  }
  if (invPre.status !== 'PENDING') {
    throw new HttpError(409, 'ALREADY_USED', { code: 'ALREADY_USED' });
  }
  if (normalizeEmail(invPre.emailNormalized) !== userEmail) {
    throw new HttpError(403, 'EMAIL_MISMATCH', { code: 'EMAIL_MISMATCH' });
  }

  // Minor consent gate — zero writes (invite stays PENDING)
  if (invPre.role === 'CATECHUMEN' && invPre.catechumenProfileId) {
    const profile = await context.entities.CatechumenProfile.findUnique({
      where: { id: invPre.catechumenProfileId },
      select: {
        id: true,
        userId: true,
        birthDate: true,
        householdId: true,
        firstName: true,
        lastName: true,
      },
    });
    if (profile && isMinor(profile.birthDate)) {
      const hasConsent = await hasActiveMinorPortalConsent(context, profile.id);
      if (!hasConsent) {
        let guardiansHint: string[] = [];
        if (profile.householdId) {
          const guardians = await context.entities.GuardianProfile.findMany({
            where: { householdId: profile.householdId },
            select: { firstName: true, lastName: true, email: true },
            take: 5,
          });
          guardiansHint = guardians.map((g: any) => {
            const name = [g.firstName, g.lastName].filter(Boolean).join(' ').trim();
            return name || (g.email ? maskEmail(g.email) : 'Responsável');
          });
        }
        throw new HttpError(403, 'MINOR_CONSENT_REQUIRED', {
          code: 'MINOR_CONSENT_REQUIRED',
          catechumenProfileId: profile.id,
          guardiansHint,
        });
      }
    }
  }

  const result = await prisma.$transaction(async (tx: any) => {
    // Lock-ish: only transition PENDING → ACCEPTED if still PENDING
    const locked = args.invitationId
      ? await tx.portalInvitation.findUnique({ where: { id: args.invitationId } })
      : await tx.portalInvitation.findUnique({ where: { tokenHash: tokenHash! } });

    if (!locked) throw new HttpError(404, 'Convite não encontrado.');
    if (locked.status === 'ACCEPTED' && locked.acceptedById === context.user.id) {
      return { success: true, idempotent: true, invitationId: locked.id, parishId: locked.parishId, role: locked.role, status: 'ACCEPTED' as const };
    }
    if (locked.status !== 'PENDING') {
      throw new HttpError(409, 'ALREADY_USED', { code: 'ALREADY_USED' });
    }
    if (normalizeEmail(locked.emailNormalized) !== userEmail) {
      throw new HttpError(403, 'EMAIL_MISMATCH', { code: 'EMAIL_MISMATCH' });
    }

    // Re-check minor inside txn (race with revoke)
    if (locked.role === 'CATECHUMEN' && locked.catechumenProfileId) {
      const cp = await tx.catechumenProfile.findUnique({
        where: { id: locked.catechumenProfileId },
        select: { id: true, userId: true, birthDate: true, householdId: true },
      });
      if (!cp) throw new HttpError(404, 'Perfil de catequizando não encontrado.');
      if (cp.userId && cp.userId !== context.user.id) {
        throw new HttpError(409, 'PROFILE_ALREADY_LINKED', { code: 'PROFILE_ALREADY_LINKED' });
      }
      if (isMinor(cp.birthDate)) {
        const consent = await tx.minorPortalConsent.findFirst({
          where: { catechumenProfileId: cp.id, revokedAt: null, status: 'ACTIVE' },
          select: { id: true },
        });
        if (!consent) {
          // Zero writes: throw → transaction rolls back
          throw new HttpError(403, 'MINOR_CONSENT_REQUIRED', {
            code: 'MINOR_CONSENT_REQUIRED',
            catechumenProfileId: cp.id,
          });
        }
      }
      if (!cp.userId) {
        const linked = await tx.catechumenProfile.updateMany({
          where: { id: cp.id, userId: null },
          data: { userId: context.user.id },
        });
        if (linked.count === 0) {
          const again = await tx.catechumenProfile.findUnique({
            where: { id: cp.id },
            select: { userId: true },
          });
          if (again?.userId !== context.user.id) {
            throw new HttpError(409, 'PROFILE_ALREADY_LINKED', { code: 'PROFILE_ALREADY_LINKED' });
          }
        }
      }
    }

    if (locked.role === 'GUARDIAN' && locked.guardianProfileId) {
      const gp = await tx.guardianProfile.findUnique({
        where: { id: locked.guardianProfileId },
        select: { id: true, userId: true, householdId: true },
      });
      if (!gp) throw new HttpError(404, 'Perfil de responsável não encontrado.');
      if (!gp.householdId) {
        throw new HttpError(400, 'HOUSEHOLD_REQUIRED', { code: 'HOUSEHOLD_REQUIRED' });
      }
      if (gp.userId && gp.userId !== context.user.id) {
        throw new HttpError(409, 'PROFILE_ALREADY_LINKED', { code: 'PROFILE_ALREADY_LINKED' });
      }
      if (!gp.userId) {
        const linked = await tx.guardianProfile.updateMany({
          where: { id: gp.id, userId: null },
          data: { userId: context.user.id },
        });
        if (linked.count === 0) {
          const again = await tx.guardianProfile.findUnique({
            where: { id: gp.id },
            select: { userId: true },
          });
          if (again?.userId !== context.user.id) {
            throw new HttpError(409, 'PROFILE_ALREADY_LINKED', { code: 'PROFILE_ALREADY_LINKED' });
          }
        }
      }
    }

    const membershipRole = locked.role; // GUARDIAN | CATECHUMEN
    let membership = await tx.membership.findFirst({
      where: {
        userId: context.user.id,
        parishId: locked.parishId,
        role: membershipRole,
      },
    });

    if (membership) {
      if (membership.status === 'ACTIVE') {
        // idempotent membership
      } else if (membership.status === 'INVITED') {
        membership = await tx.membership.update({
          where: { id: membership.id },
          data: {
            status: 'ACTIVE',
            communityId: locked.communityId ?? membership.communityId,
            inviteToken: null,
            inviteTokenExpiresAt: null,
          },
        });
      } else if (membership.status === 'SUSPENDED') {
        // Do not auto-reactivate deliberate suspensions via invite accept.
        throw new HttpError(403, 'MEMBERSHIP_SUSPENDED', {
          code: 'MEMBERSHIP_SUSPENDED',
          membershipId: membership.id,
        });
      } else {
        // INACTIVE / unknown: require staff re-invite path; do not silently reopen.
        throw new HttpError(403, 'MEMBERSHIP_INACTIVE', {
          code: 'MEMBERSHIP_INACTIVE',
          membershipId: membership.id,
          status: membership.status,
        });
      }
    } else {
      membership = await tx.membership.create({
        data: {
          userId: context.user.id,
          parishId: locked.parishId,
          communityId: locked.communityId,
          role: membershipRole,
          status: 'ACTIVE',
        },
      });
    }

    const updatedInv = await tx.portalInvitation.updateMany({
      where: { id: locked.id, status: 'PENDING' },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedById: context.user.id,
      },
    });
    if (updatedInv.count === 0) {
      throw new HttpError(409, 'ALREADY_USED', { code: 'ALREADY_USED' });
    }

    // Consume any AuthContinuation rows for this invite (PR5 will set them)
    try {
      await tx.authContinuation.updateMany({
        where: { portalInvitationId: locked.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
    } catch {
      /* table may be unused */
    }

    return {
      success: true,
      idempotent: false,
      invitationId: locked.id,
      parishId: locked.parishId,
      role: locked.role,
      status: 'ACCEPTED' as const,
      membershipId: membership.id,
    };
  });

  if (!result.idempotent) {
    await writeAuditLog(context, 'CREATE', 'Membership', result.membershipId || result.invitationId, {
      operation: 'MEMBER_ACCEPT_PORTAL',
      invitationId: result.invitationId,
      parishId: result.parishId,
      role: result.role,
    });
  }

  return result;
};

// ═══════════════════════════════════════════════════════════════════════════
// resendPortalInvitation
// ═══════════════════════════════════════════════════════════════════════════

export const resendPortalInvitation = async (
  args: { invitationId: string },
  context: any,
) => {
  requireAuth(context.user);
  if (!args.invitationId) throw new HttpError(400, 'invitationId é obrigatório.');

  const inv = await context.entities.PortalInvitation.findUnique({
    where: { id: args.invitationId },
    include: { parish: { select: { name: true } } },
  });
  if (!inv) throw new HttpError(404, 'Convite não encontrado.');

  // In-memory rate limit per staff user+parish (not shared across Node instances).
  checkRateLimit(`resend-portal-inv:${context.user.id}:${inv.parishId}`, RATE_LIMIT_MAX);

  if (inv.status !== 'PENDING') {
    throw new HttpError(400, 'Apenas convites PENDING podem ser reenviados.');
  }
  if (inv.expiresAt && new Date() > new Date(inv.expiresAt)) {
    await context.entities.PortalInvitation.update({
      where: { id: inv.id },
      data: { status: 'EXPIRED' },
    });
    throw new HttpError(410, 'EXPIRED', { code: 'EXPIRED' });
  }

  const inviterRole = await resolvePortalInviterRole(context, inv.parishId);
  assertCanAssignPortalRole(inviterRole, inv.role, !!context.user.isAdmin);

  const token = generatePortalInviteToken();
  const tokenHash = hashPortalInviteToken(token);
  const expiresAt = defaultExpiry();
  const now = new Date();

  const updated = await context.entities.PortalInvitation.update({
    where: { id: inv.id },
    data: {
      tokenHash,
      expiresAt,
      lastSentAt: now,
      resendCount: (inv.resendCount || 0) + 1,
    },
  });

  const location = inv.parish?.name || 'a paróquia';
  try {
    if (!(process.env.VITEST || process.env.NODE_ENV === 'test' || !process.env.RESEND_API_KEY)) {
      await deliverInviteEmail(
        { to: inv.emailNormalized, location, role: inv.role, token },
        context,
      );
    }
  } catch (error) {
    logger.error('[portalInvitation] Erro ao reenviar email', { error: String(error) });
  }

  await writeAuditLog(context, 'UPDATE', 'PortalInvitation', inv.id, {
    operation: 'PORTAL_INVITE_RESEND',
    parishId: inv.parishId,
  });

  return {
    ...toListDto(updated),
    parishName: location,
    token,
    whatsappUrl: whatsappUrl(token, location),
    inviteUrl: familyPortalUrl(`/convite/${token}`),
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// revokePortalInvitation
// ═══════════════════════════════════════════════════════════════════════════

export const revokePortalInvitation = async (
  args: { invitationId: string },
  context: any,
) => {
  requireAuth(context.user);
  if (!args.invitationId) throw new HttpError(400, 'invitationId é obrigatório.');

  const inv = await context.entities.PortalInvitation.findUnique({
    where: { id: args.invitationId },
  });
  if (!inv) throw new HttpError(404, 'Convite não encontrado.');
  if (inv.status !== 'PENDING') {
    throw new HttpError(400, 'Apenas convites PENDING podem ser revogados.');
  }

  const inviterRole = await resolvePortalInviterRole(context, inv.parishId);
  assertCanAssignPortalRole(inviterRole, inv.role, !!context.user.isAdmin);

  const updated = await context.entities.PortalInvitation.update({
    where: { id: inv.id },
    data: { status: 'REVOKED' },
  });

  await writeAuditLog(context, 'UPDATE', 'PortalInvitation', inv.id, {
    operation: 'PORTAL_INVITE_REVOKE',
    parishId: inv.parishId,
  });

  return toListDto(updated);
};
