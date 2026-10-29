import { expect, it, vi } from 'vitest';
vi.mock('wasp/server', () => ({ HttpError: class extends Error { constructor(public statusCode: number, message?: string) { super(message); } }, prisma: {} }));
vi.mock('../server/jobs/inviteEmailUtils', () => ({ deliverInviteEmail: vi.fn(), roleLabel: (r: string) => r }));
vi.mock('../auth/email-and-pass/familyAuthEmailHints', () => ({ rememberFamilyAuthEmail: vi.fn() }));
vi.mock('../server/security/persistentRateLimit', () => ({ assertPersistentRateLimit: vi.fn(), INVITE_RESEND_RATE_LIMIT: {} }));
vi.mock('../server/auth/helpers', async original => ({ ...await original<any>(), writeAuditLog: vi.fn() }));
import { listParishMembers, listFamilyPortalInvitations, resendInvitation, cancelInvitation } from '../server/operations/memberOperations';
function projected(row: any, select: any) { return select ? Object.fromEntries(Object.keys(select).map(k => [k, row[k]])) : row; }
function context(role = 'LEAD_CATECHIST', classes = ['a'], recipient = 'b') {
  const row = { id: 'outside', userId: 'outside', parishId: 'p', role: 'GUARDIAN', status: 'INVITED', email: `${recipient}@example.test`, user: { email: `${recipient}@example.test` }, parish: { name: 'Fictícia' }, createdAt: new Date(), inviteToken: 'synthetic' };
  const update = vi.fn(async () => ({ id: row.id }));
  return { user: { id: 'actor', isAdmin: role === 'ADMIN' }, entities: {
    Parish: { findFirst: vi.fn(async () => null) },
    Membership: { findFirst: vi.fn(async () => ({ id: 'actor', role })), findMany: vi.fn(async ({ where, select }: any) => {
      if (where.userId) return [{ role, parishId: 'p' }];
      if (where.OR) {
        const shared = where.OR.some((w: any) => w.userId === row.userId || w.user?.catechistOfClasses?.some?.classId?.in?.includes(recipient));
        return shared ? [projected(row, select)] : [];
      }
      if (where.AND) return where.AND[0].OR.some((w: any) => w.role === row.role && w.user?.email?.in?.includes(row.email)) ? [row] : [];
      return [select ? Object.fromEntries(Object.keys(select).map(k => [k, (row as any)[k]])) : row];
    }), findUnique: vi.fn(async () => row), update, updateMany: vi.fn() },
    ClassCatechist: { findMany: vi.fn(async () => classes.map(classId => ({ classId }))) },
    GuardianProfile: { findMany: vi.fn(async () => [{ email: 'a@example.test' }]) },
    CatechumenProfile: { findMany: vi.fn(async () => []) },
    PendingInvitation: { findMany: vi.fn(async ({ where }: any) => where.AND ? (where.AND[0].OR.some((w: any) => w.role === row.role && w.email?.in?.includes(row.email)) ? [row] : []) : [row]), findUnique: vi.fn(async () => row), update, delete: vi.fn() },
  } };
}
it('nega membro de outra turma e não devolve token', async () => {
  expect(await listParishMembers({ parishId: 'p' }, context())).toEqual([]);
  const rows = await listParishMembers({ parishId: 'p' }, context('PARISH_COORDINATOR'));
  expect(rows).toHaveLength(1);
  expect(rows[0]).not.toHaveProperty('inviteToken');
});
it('catequista sem turma não recebe membro alheio', async () => {
  expect(await listParishMembers({ parishId: 'p' }, context('LEAD_CATECHIST', []))).toEqual([]);
});
it('nega convites familiares fora da turma', async () => {
  expect(await listFamilyPortalInvitations({ parishId: 'p' }, context())).toEqual([]);
});
it.each([resendInvitation, cancelInvitation])('nega mutação fora do escopo antes de gravar', async operation => {
  for (const args of [{ pendingInvitationId: 'outside' }, { membershipId: 'outside' }]) {
    const c = context();
    await expect(operation(args, c)).rejects.toMatchObject({ statusCode: 403 });
    expect(c.entities.PendingInvitation.update).not.toHaveBeenCalled();
    expect(c.entities.PendingInvitation.delete).not.toHaveBeenCalled();
  }
});
it.each(['PARISH_COORDINATOR', 'ADMIN'])('%s preserva listagens e gestão', async role => {
  expect(await listParishMembers({ parishId: 'p' }, context(role))).toHaveLength(1);
  expect(await listFamilyPortalInvitations({ parishId: 'p' }, context(role))).toHaveLength(1);
  await expect(cancelInvitation({ pendingInvitationId: 'outside' }, context(role))).resolves.toEqual({ success: true });
});
it('responsável não ganha acesso à equipe', async () => {
  await expect(listParishMembers({ parishId: 'p' }, context('GUARDIAN'))).rejects.toMatchObject({ statusCode: 403 });
});

it.each([resendInvitation, cancelInvitation])('catequista atribuído mantém gestão da própria família', async operation => {
  await expect(operation({ pendingInvitationId: 'outside' }, context('LEAD_CATECHIST', ['a'], 'a'))).resolves.toMatchObject({ success: true });
  await expect(operation({ membershipId: 'outside' }, context('LEAD_CATECHIST', ['a'], 'a'))).resolves.toMatchObject({ success: true });
});
it('DTO de reenvio mantém link usado no front sem token avulso', async () => {
  const result = await resendInvitation({ pendingInvitationId: 'outside' }, context('ADMIN'));
  expect(result.inviteUrl).toContain('/convite/');
  expect(result).not.toHaveProperty('token');
});

it('catequista mantém colega da mesma turma e convite da própria família', async () => {
  const c = context('LEAD_CATECHIST', ['a'], 'a');
  expect(await listParishMembers({ parishId: 'p' }, c)).toHaveLength(1);
  expect(await listFamilyPortalInvitations({ parishId: 'p' }, c)).toHaveLength(1);
});
