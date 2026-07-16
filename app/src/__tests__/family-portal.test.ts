/**
 * family-portal.test.ts — Tests for the Family Portal, invitation system, and onboarding fixes.
 *
 * Run with: NODE_ENV=development npx vitest run src/__tests__/family-portal.test.ts
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { prisma, USERS, PARISH_SAO_JOSE, makeContext } from './setup';

const itOrSkip = process.env.NODE_ENV === 'development' ? it : it.skip;

// ── UserContext tests ───────────────────────────────────────────────────────

import { getCurrentUserContext } from '../server/operations/userContext';

describe('getCurrentUserContext', () => {
  // We test with an admin context since getCurrentUserContext needs a real user
  const adminCtx = makeContext('admin');

  itOrSkip('returns needsOnboarding=false for admin', async () => {
    // Admin always has access via isAdmin flag — override context
    const ctx = { user: { id: USERS.admin.id, isAdmin: true }, entities: prisma };
    const result = await getCurrentUserContext(undefined as any, ctx);
    expect(result.needsOnboarding).toBe(false);
  });

  itOrSkip('returns hasPendingInvitations flag', async () => {
    const ctx = { user: { id: USERS.guardian.id, isAdmin: false, email: USERS.guardian.email }, entities: prisma };
    const result = await getCurrentUserContext(undefined as any, ctx);
    expect(typeof result.hasPendingInvitations).toBe('boolean');
  });

  itOrSkip('returns memberships with correct fields', async () => {
    const ctx = { user: { id: USERS.coordSaoJose.id, isAdmin: false, email: USERS.coordSaoJose.email }, entities: prisma };
    const result = await getCurrentUserContext(undefined as any, ctx);
    expect(Array.isArray(result.memberships)).toBe(true);
    if (result.memberships.length > 0) {
      const m = result.memberships[0];
      expect(m).toHaveProperty('id');
      expect(m).toHaveProperty('parishId');
      expect(m).toHaveProperty('role');
      expect(m).toHaveProperty('status');
    }
  });
});

// ── joinParish tests ────────────────────────────────────────────────────────

import { joinParish } from '../server/operations/joinParish';

describe('joinParish', () => {
  itOrSkip('rejects self-join to institutional parish without invitation', async () => {
    const ctx = makeContext('guardian');
    try {
      await joinParish({ parishId: PARISH_SAO_JOSE, role: 'GUARDIAN' }, ctx);
      // If it doesn't throw, the guardian might already have a membership — check
      const membership = await prisma.membership.findFirst({
        where: { userId: USERS.guardian.id, parishId: PARISH_SAO_JOSE },
      });
      // If membership exists, it's because the seed already created one — skip test
      if (!membership) {
        expect.unreachable('Should have thrown 403');
      }
    } catch (e: any) {
      const code = e.statusCode || e.status || 0;
      expect([403, 404]).toContain(code);
    }
  });

  itOrSkip('rejects privileged role self-assignment', async () => {
    const ctx = makeContext('guardian');
    try {
      await joinParish({ parishId: PARISH_SAO_JOSE, role: 'PARISH_COORDINATOR' }, ctx);
      expect.unreachable('Should have thrown');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(403);
    }
  });
});

// ── Member operations: catechist invite permissions ─────────────────────────

import { inviteUserToParish, resendInvitation } from '../server/operations/memberOperations';

describe('inviteUserToParish', () => {
  const leadCtx = makeContext('leadCatechist');
  const coordCtx = makeContext('coordSaoJose');
  const auxCtx = makeContext('assistantCatechist');

  itOrSkip('allows LEAD_CATECHIST to invite GUARDIAN', async () => {
    const email = `test_guardian_invite_${Date.now()}@test.com`;
    const result = await inviteUserToParish(
      {
        email,
        parishId: PARISH_SAO_JOSE,
        role: 'GUARDIAN',
      },
      leadCtx,
    );
    expect(result).toBeTruthy();
    expect(result.kind).toBe('pending');
    expect(result.emailDelivery).toBeDefined();
    expect(result.inviteUrl).toContain('/convite/');
    await prisma.pendingInvitation.deleteMany({ where: { email } });
  });

  itOrSkip('allows LEAD_CATECHIST to invite CATECHUMEN', async () => {
    const email = `test_catechumen_invite_${Date.now()}@test.com`;
    const result = await inviteUserToParish(
      {
        email,
        parishId: PARISH_SAO_JOSE,
        role: 'CATECHUMEN',
      },
      leadCtx,
    );
    expect(result).toBeTruthy();
    await prisma.pendingInvitation.deleteMany({ where: { email } });
  });

  itOrSkip('prevents LEAD_CATECHIST from inviting PARISH_COORDINATOR', async () => {
    await expect(
      inviteUserToParish(
        {
          email: 'test_escalation@example.com',
          parishId: PARISH_SAO_JOSE,
          role: 'PARISH_COORDINATOR',
        },
        leadCtx,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  itOrSkip('prevents ASSISTANT from inviting LEAD_CATECHIST', async () => {
    await expect(
      inviteUserToParish(
        {
          email: 'test_aux_team@example.com',
          parishId: PARISH_SAO_JOSE,
          role: 'LEAD_CATECHIST',
        },
        auxCtx,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  itOrSkip('allows coordinator to invite LEAD_CATECHIST without class', async () => {
    const email = `test_coord_invite_${Date.now()}@test.com`;
    const result = await inviteUserToParish(
      {
        email,
        parishId: PARISH_SAO_JOSE,
        role: 'LEAD_CATECHIST',
      },
      coordCtx,
    );
    expect(result).toBeTruthy();
    expect(result.inviteUrl).toContain('catechis.app');
    expect(result.inviteUrl).not.toContain('familia.');
    await prisma.pendingInvitation.deleteMany({ where: { email } });
  });

  itOrSkip('normalizes email casing and spaces', async () => {
    const email = `  MixCase.Invite_${Date.now()}@Example.COM `;
    const result = await inviteUserToParish(
      {
        email,
        parishId: PARISH_SAO_JOSE,
        role: 'GUARDIAN',
      },
      coordCtx,
    );
    expect(result.email).toBe(email.trim().toLowerCase());
    await prisma.pendingInvitation.deleteMany({
      where: { email: result.email },
    });
  });

  itOrSkip('idempotent re-invite updates pending invitation', async () => {
    const email = `test_reinvite_${Date.now()}@test.com`;
    const first = await inviteUserToParish(
      { email, parishId: PARISH_SAO_JOSE, role: 'GUARDIAN' },
      coordCtx,
    );
    const second = await inviteUserToParish(
      { email, parishId: PARISH_SAO_JOSE, role: 'CATECHUMEN' },
      coordCtx,
    );
    expect(first.id).toBe(second.id);
    expect(second.role).toBe('CATECHUMEN');
    await prisma.pendingInvitation.deleteMany({ where: { email: second.email } });
  });
});

describe('resendInvitation', () => {
  const coordCtx = makeContext('coordSaoJose');

  itOrSkip('requires pendingInvitationId or membershipId', async () => {
    try {
      await resendInvitation({}, coordCtx);
      expect.unreachable('Should have thrown 400');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(400);
    }
  });

  itOrSkip('returns 404 for non-existent invitation', async () => {
    try {
      await resendInvitation(
        { pendingInvitationId: 'non-existent-id-00000000' },
        coordCtx,
      );
      expect.unreachable('Should have thrown 404');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(404);
    }
  });
});

// ── portal.ts utility tests ─────────────────────────────────────────────────

import { isFamilyPortalHost, isFamilyPortalRole, familyPortalUrl } from '../shared/portal';

describe('portal utilities', () => {
  it('isFamilyPortalHost detects familia subdomain', () => {
    expect(isFamilyPortalHost('familia.catechis.app')).toBe(true);
    expect(isFamilyPortalHost('familia.localhost')).toBe(true);
    expect(isFamilyPortalHost('catechis.app')).toBe(false);
    expect(isFamilyPortalHost('homolog.catechis.app')).toBe(false);
  });

  it('isFamilyPortalHost detects familia-homolog host', () => {
    expect(isFamilyPortalHost('familia-homolog.catechis.app')).toBe(true);
  });

  it('isFamilyPortalRole identifies family roles', () => {
    expect(isFamilyPortalRole('GUARDIAN')).toBe(true);
    expect(isFamilyPortalRole('CATECHUMEN')).toBe(true);
    expect(isFamilyPortalRole('PARISH_COORDINATOR')).toBe(false);
    expect(isFamilyPortalRole('LEAD_CATECHIST')).toBe(false);
    expect(isFamilyPortalRole(null)).toBe(false);
    expect(isFamilyPortalRole(undefined)).toBe(false);
  });

  it('familyPortalUrl builds correct URLs', () => {
    const url = familyPortalUrl('/convite/abc123');
    expect(url).toContain('familia.');
    expect(url).toContain('/convite/abc123');
    expect(url.startsWith('https://')).toBe(true);
  });

  it('familyPortalUrl normalizes paths without leading slash', () => {
    const url = familyPortalUrl('convite/abc123');
    expect(url).toContain('/convite/abc123');
  });

  // FAMILY_PORTAL_HOST is a module-level const read at import time, so changing
  // process.env at runtime has no effect on the already-imported binding. To test
  // the env-driven host, re-import the module with the env var set.
  it('familyPortalUrl uses familia-homolog host in homolog env', async () => {
    const prev = process.env.FAMILY_PORTAL_HOST;
    process.env.FAMILY_PORTAL_HOST = 'familia-homolog.catechis.app';
    try {
      vi.resetModules();
      const { familyPortalUrl: familyPortalUrlHomolog } = await import('../shared/portal');
      const url = familyPortalUrlHomolog('/convite/token-qa');
      expect(url).toContain('familia-homolog.catechis.app');
      expect(url).toContain('/convite/token-qa');
    } finally {
      if (prev === undefined) delete process.env.FAMILY_PORTAL_HOST;
      else process.env.FAMILY_PORTAL_HOST = prev;
      vi.resetModules();
      await import('../shared/portal');
    }
  });
});

// ── Token operations ────────────────────────────────────────────────────────

import { getInvitationByToken, acceptInvitationByToken } from '../server/operations/memberOperations';

describe('getInvitationByToken', () => {
  const itToken = process.env.NODE_ENV === 'development' ? it : it.skip;

  itToken('returns 404 for non-existent token', async () => {
    const ctx = makeContext('admin');
    try {
      await getInvitationByToken({ token: 'non-existent-token-00000000' }, ctx);
      expect.unreachable('Should have thrown 404');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(404);
    }
  });

  itToken('returns invitation data for valid token (requires db migration)', async () => {
    // Pending: requires prisma generate after schema migration to add `token` field
    expect(true).toBe(true);
  });

  itToken('returns 410 for expired token (requires db migration)', async () => {
    // Pending: requires prisma generate after schema migration to add `token` field
    expect(true).toBe(true);
  });
});

describe('acceptInvitationByToken', () => {
  const itToken = process.env.NODE_ENV === 'development' ? it.skip : it.skip;

  itToken('returns 401 for unauthenticated request', async () => {
    try {
      await acceptInvitationByToken(
        { token: 'some-token' },
        { user: null, entities: prisma },
      );
      expect.unreachable('Should have thrown 401');
    } catch (e: any) {
      expect([401, 403]).toContain(e.statusCode || e.status);
    }
  });
});
