import { describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => ({
  HttpError: class extends Error {
    constructor(public statusCode: number, message?: string) { super(message); }
  },
  prisma: {},
}));
vi.mock('../server/ai/credits', () => ({ assertAndDeductCredits: vi.fn() }));
vi.mock('../server/ai/providers', () => ({ detectProvider: vi.fn(), createAiClient: vi.fn(), aiCompletion: vi.fn() }));
vi.mock('../server/storage/contentSourceStorage', () => ({ deleteContentSourceFile: vi.fn() }));

import { assertCanAccessContent, assertCanModifyContent, getUserRoleAndParish } from '../server/auth/contentAccess';
import { updateContentItem, updateContentStatus, addBibleRef, addCatechismRef, deleteContentItem } from '../server/operations/contentOperations';

import { restoreContentVersion } from '../server/operations/collaborativeOperations';

const item = { id: 'content-b', parishId: null, dioceseId: 'diocese-b', ownerType: 'DIOCESE', visibilityScope: 'DIOCESE', status: 'DRAFT', createdById: 'creator', mainContent: 'synthetic-private' };
function context(role = 'DIOCESE_ADMIN', dioceseId = 'diocese-a', status = 'ACTIVE', creator = false) {
  const member = { userId: creator ? 'creator' : 'actor', role, status, parishId: 'parish', parish: { dioceseId } };
  return {
    user: { id: member.userId, isAdmin: false },
    entities: {
      Membership: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.status !== member.status || (where.role && where.role !== role) || (where.parish?.dioceseId && where.parish.dioceseId !== dioceseId)) return null;
          return member;
        }),
        findMany: vi.fn(async () => status === 'ACTIVE' ? [member] : []),
      },
      ContentItem: {
        findUnique: vi.fn(async ({ select }: any) => select
          ? Object.fromEntries(Object.keys(select).map(key => [key, (item as any)[key]]))
          : item),
        update: vi.fn(async ({ select, data }: any) => {
          const row: any = { ...item, ...data };
          return select ? Object.fromEntries(Object.keys(select).map(key => [key, row[key]])) : row;
        }),
      },
    },
  };
}

describe('C-08: conteúdo diocesano', () => {
  it('recusa update de administrador de outra diocese antes de escrever ou devolver dados', async () => {
    const ctx = context();
    await expect(updateContentItem({ id: item.id, title: 'Título' }, ctx)).rejects.toMatchObject({ statusCode: 403 });
    expect(ctx.entities.ContentItem.update).not.toHaveBeenCalled();
  });
  it.each([
    ['DIOCESE_ADMIN', 'diocese-a', 'ACTIVE'],
    ['DIOCESE_ADMIN', 'diocese-b', 'INACTIVE'],
    ['PARISH_COORDINATOR', 'diocese-b', 'ACTIVE'],
    ['LEAD_CATECHIST', 'diocese-b', 'ACTIVE'],
    ['GUARDIAN', 'diocese-b', 'ACTIVE'],
  ])('criador também precisa administrar a diocese: %s %s %s', async (role, diocese, status) => {
    await expect(assertCanModifyContent(context(role, diocese, status, true), item)).rejects.toMatchObject({ statusCode: 403 });
  });
  it('preserva administrador ativo da diocese e devolve somente id no update', async () => {
    const ctx = context('DIOCESE_ADMIN', 'diocese-b');
    await expect(updateContentItem({ id: item.id, title: 'Título' }, ctx)).resolves.toEqual({ id: item.id });
    expect(ctx.entities.ContentItem.update).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true } }));
  });
  it('null explícito não escolhe vínculo arbitrário', async () => {
    const ctx = context();
    await expect(getUserRoleAndParish(ctx, null)).resolves.toEqual({ role: '', parishId: null });
    expect(ctx.entities.Membership.findFirst).not.toHaveBeenCalled();
  });
  it.each(['status', 'bible', 'catechism', 'delete'])('recusa operação %s de outra diocese inclusive para criador', async operation => {
    const ctx = context('DIOCESE_ADMIN', 'diocese-a', 'ACTIVE', true);
    const call = operation === 'status' ? updateContentStatus({ id: item.id, status: 'PUBLISHED' }, ctx)
      : operation === 'bible' ? addBibleRef({ contentId: item.id, verseId: 'verse' }, ctx)
      : operation === 'catechism' ? addCatechismRef({ contentId: item.id, entryId: 'entry' }, ctx)
      : deleteContentItem({ id: item.id }, ctx);
    await expect(call).rejects.toMatchObject({ statusCode: 403 });
  });
  it('preserva publicação pelo administrador da diocese', async () => {
    const ctx = context('DIOCESE_ADMIN', 'diocese-b');
    await expect(updateContentStatus({ id: item.id, status: 'PUBLISHED' }, ctx)).resolves.toMatchObject({ status: 'PUBLISHED' });
  });
  it('preserva leitura do rascunho pelo administrador da diocese', async () => {
    await expect(assertCanAccessContent(context('DIOCESE_ADMIN', 'diocese-b'), item)).resolves.toBeUndefined();
  });
  it.each([false, true])('restauração exige escrita mesmo quando leitura é permitida: admin correto %s', async allowed => {
    const ctx = context('DIOCESE_ADMIN', allowed ? 'diocese-b' : 'diocese-a', 'ACTIVE', true);
    const version = { contentId: item.id, body: '{}', content: { ...item, createdById: ctx.user.id } };
    Object.assign(ctx.entities, { ContentVersion: { findUnique: vi.fn(async () => version) } });
    if (allowed) await expect(restoreContentVersion({ versionId: 'version' }, ctx)).resolves.toEqual({ success: true });
    else {
      await expect(restoreContentVersion({ versionId: 'version' }, ctx)).rejects.toMatchObject({ statusCode: 403 });
      expect(ctx.entities.ContentItem.update).not.toHaveBeenCalled();
    }
  });
  it('preserva admin da plataforma', async () => {
    const ctx = context(); ctx.user.isAdmin = true;
    await expect(assertCanModifyContent(ctx, item)).resolves.toBeUndefined();
    await expect(assertCanAccessContent(ctx, item)).resolves.toBeUndefined();
  });
  it('recusa rascunho com papel pastoral de outra diocese', async () => {
    const ctx = context('PARISH_COORDINATOR', 'diocese-a');
    ctx.entities.Membership.findMany.mockResolvedValue([{ parish: { dioceseId: 'diocese-b' } } as any]);
    await expect(assertCanAccessContent(ctx, item)).rejects.toMatchObject({ statusCode: 403 });
  });
  it.each(['PARISH_COORDINATOR', 'LEAD_CATECHIST', 'GUARDIAN'])('preserva leitura publicada herdada para %s da diocese', async role => {
    await expect(assertCanAccessContent(context(role, 'diocese-b'), { ...item, status: 'PUBLISHED' })).resolves.toBeUndefined();
  });
  it.each(['PARISH_COORDINATOR', 'LEAD_CATECHIST'])('preserva edição paroquial para %s', async role => {
    await expect(assertCanModifyContent(context(role), { parishId: 'parish', createdById: 'creator' })).resolves.toBeUndefined();
  });
});
