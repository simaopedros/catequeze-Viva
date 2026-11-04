import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('wasp/server', () => ({ HttpError: class extends Error { constructor(public statusCode: number) { super(); } }, prisma: {} }));
import { assertRegistrationPermission } from '../server/auth/registrationPermissions';
import { ADMIN_ROLES, COORDINATOR_ROLES } from '../server/auth/roles';
import { isStaffRole, resolveWorkspaceAccess } from '../server/operations/sharedScope';
import { getAssignableRoles } from '../shared/teamInvitePolicy';

function ctx(role = 'PARISH_SECRETARY', opts: { parish?: string; status?: string; grant?: boolean; communityId?: string } = {}) {
  return { user: { id: 'actor', isAdmin: false }, entities: {
    Membership: { findFirst: vi.fn(async ({ where }: any) => where.userId === 'actor' && where.parishId === (opts.parish ?? 'p1') && where.status === (opts.status ?? 'ACTIVE') ? { id: 'm1', role, communityId: opts.communityId ?? null } : null) },
    Parish: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    RegistrationPermissionGrant: { findFirst: vi.fn(async ({ where }: any) => opts.grant && where.membershipId === 'm1' && where.revokedAt === null ? { id: 'g1' } : null) },
  } };
}
const permission = (c: any, action: any = 'APPROVE_ENROLLMENT', parishId = 'p1', communityId?: string) => assertRegistrationPermission(c, { parishId, communityId, action });
afterEach(() => { delete process.env.REGISTRATIONS_ENABLED; });
describe('autorização de inscrições', () => {
  it('desliga o recurso por padrão', async () => { await expect(permission(ctx())).rejects.toMatchObject({ statusCode: 404 }); });
  it('exige concessão ativa para secretaria e não usa paróquia diferente', async () => {
    process.env.REGISTRATIONS_ENABLED = 'true';
    await expect(permission(ctx())).rejects.toMatchObject({ statusCode: 403 });
    await expect(permission(ctx('PARISH_SECRETARY', { grant: true }))).resolves.toBeUndefined();
    await expect(permission(ctx('PARISH_SECRETARY', { grant: true }), 'APPROVE_ENROLLMENT', 'p2')).rejects.toMatchObject({ statusCode: 403 });
    await expect(permission(ctx('PARISH_SECRETARY', { status: 'SUSPENDED', grant: true }))).rejects.toMatchObject({ statusCode: 403 });
  });
  it('restringe coordenador à comunidade e exige grant não revogado', async () => {
    process.env.REGISTRATIONS_ENABLED = 'true';
    const c = ctx('COMMUNITY_COORDINATOR', { grant: true, communityId: 'c1' });
    await expect(permission(c, 'OVERRIDE_CAPACITY', 'p1', 'c2')).rejects.toMatchObject({ statusCode: 403 });
    await expect(permission(c, 'OVERRIDE_CAPACITY', 'p1', 'c1')).resolves.toBeUndefined();
    expect(c.entities.RegistrationPermissionGrant.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { membershipId: 'm1', action: 'OVERRIDE_CAPACITY', revokedAt: null } }));
  });
  it.each(['PARISH_PRIEST', 'PARISH_SECRETARY'])('não concede acesso geral a %s', async role => {
    expect(ADMIN_ROLES).not.toContain(role); expect(COORDINATOR_ROLES).not.toContain(role); expect(isStaffRole(role)).toBe(false);
    const access = await resolveWorkspaceAccess(ctx(role), 'p1');
    expect(access?.allowedClassIds).toEqual([]); expect(access?.canManageParish).toBe(false);
  });
  it('aplica flag e hierarquia dos convites', () => {
    expect(getAssignableRoles('PARISH_COORDINATOR', false)).not.toContain('PARISH_PRIEST');
    expect(getAssignableRoles('PARISH_COORDINATOR', false, true)).toContain('PARISH_PRIEST');
    expect(getAssignableRoles('PARISH_PRIEST', false, true)).toEqual(['PARISH_PRIEST', 'PARISH_SECRETARY']);
    expect(getAssignableRoles('PARISH_SECRETARY', false, true)).toEqual([]);
  });
});

import { assertCanAccessClass, assertCanAccessCatechumenProfile } from '../server/auth/helpers';
import { assertCanManageHousehold } from '../server/operations/familyOperations';
it.each(['PARISH_PRIEST', 'PARISH_SECRETARY'])('nega acesso a turma, família e cadastro para %s mesmo com vínculo antigo de turma', async role => {
  const c: any = ctx(role);
  c.entities.CatechesisClass = { findUnique: vi.fn().mockResolvedValue({ parishId: 'p1', catechists: [{ userId: 'actor' }] }) };
  c.entities.GuardianProfile = { findUnique: vi.fn().mockResolvedValue(null) };
  c.entities.ClassEnrollment = { findFirst: vi.fn().mockResolvedValue(null) };
  c.entities.CatechumenProfile = { findUnique: vi.fn().mockResolvedValue({ userId: null, parishId: 'p1', householdId: null, household: null, enrollments: [{ status: 'ENROLLED', class: { id: 'class', parishId: 'p1' } }] }) };
  c.entities.Household = { findFirst: vi.fn().mockResolvedValue(null) };
  await expect(assertCanAccessClass(c, 'class')).rejects.toMatchObject({ statusCode: 403 });
  await expect(assertCanAccessCatechumenProfile(c, 'person')).rejects.toMatchObject({ statusCode: 403 });
  await expect(assertCanManageHousehold(c, { id: 'family', parishId: 'p1' }, 'Acesso negado')).rejects.toMatchObject({ statusCode: 403 });
});

import { updateMembershipRole } from '../server/operations/memberOperations';
it('permite ao pároco gerir apenas papéis autorizados com a flag ativa', async () => {
  process.env.REGISTRATIONS_ENABLED = 'true';
  const c: any = ctx('PARISH_PRIEST');
  c.entities.Membership.findUnique = vi.fn().mockResolvedValue({ id: 'member', parishId: 'p1', role: 'PARISH_SECRETARY' });
  c.entities.Membership.update = vi.fn().mockResolvedValue({ id: 'member' });
  await expect(updateMembershipRole({ membershipId: 'member', role: 'PARISH_PRIEST' }, c)).resolves.toEqual({ id: 'member' });
  c.entities.Membership.findUnique.mockResolvedValue({ id: 'member', parishId: 'p1', role: 'PARISH_COORDINATOR' });
  await expect(updateMembershipRole({ membershipId: 'member', role: 'PARISH_SECRETARY' }, c)).rejects.toMatchObject({ statusCode: 403 });
  c.entities.Membership.findUnique.mockResolvedValue({ id: 'member', parishId: 'p1', role: 'PARISH_SECRETARY' });
  delete process.env.REGISTRATIONS_ENABLED;
  await expect(updateMembershipRole({ membershipId: 'member', role: 'PARISH_PRIEST' }, c)).rejects.toMatchObject({ statusCode: 403 });
});

import { listDocuments } from '../server/operations/documentOperations';
it.each(['PARISH_PRIEST', 'PARISH_SECRETARY'])('não lista documentos antigos para %s', async role => {
  const c: any = ctx(role);
  c.entities.Document = { findMany: vi.fn() };
  await expect(listDocuments({ workspaceId: 'p1' }, c)).resolves.toEqual([]);
  expect(c.entities.Document.findMany).not.toHaveBeenCalled();
});

import { getContactsForConversation } from '../server/operations/conversationOperations';
it.each(['PARISH_PRIEST', 'PARISH_SECRETARY'])('não lista contatos paroquiais para %s', async role => {
  await expect(getContactsForConversation({ workspaceId: 'p1' }, ctx(role))).rejects.toMatchObject({ statusCode: 403 });
});

import { globalSearch } from '../server/operations/searchOperations';
it.each(['PARISH_PRIEST', 'PARISH_SECRETARY'])('não pesquisa conteúdo e comunidades antigos para %s', async role => {
  const c: any = ctx(role);
  c.entities.Membership.findMany = vi.fn().mockResolvedValue([{ parishId: 'p1', role }]);
  await expect(globalSearch({ query: 'teste' }, c)).resolves.toEqual([]);
});
