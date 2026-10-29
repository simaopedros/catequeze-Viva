import { describe, expect, it, vi } from 'vitest';
vi.mock('wasp/server', () => ({ HttpError: class extends Error {} }));
vi.mock('../server/cache/referenceCache', () => ({
  isCacheReady: () => true, triggerBackgroundLoad: vi.fn(),
  searchBibleInCache: () => [], searchCatechismInCache: () => [], searchDirectoryInCache: () => [],
}));
import { globalSearch } from '../server/operations/searchOperations';

// Evaluate Prisma predicates against synthetic related records.
function matches(row: any, where: any): boolean {
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (key === 'AND') return value.every((w: any) => matches(row, w));
    if (key === 'OR') return value.some((w: any) => matches(row, w));
    if (value === null || typeof value !== 'object') return row[key] === value;
    if ('in' in value) return value.in.includes(row[key]);
    if ('contains' in value) return String(row[key] ?? '').toLowerCase().includes(value.contains.toLowerCase());
    if ('some' in value) return (row[key] ?? []).some((r: any) => matches(r, value.some));
    return row[key] != null && matches(row[key], value);
  });
}
function fixture(roles: Record<string, string>, assigned = ['class-a'], admin = false) {
  const profiles = ['a', 'b', 'c'].map(suffix => {
    const parishId = suffix === 'c' ? 'parish-b' : 'parish-a';
    return { id: `student-${suffix}`, firstName: 'Sintetica', lastName: suffix,
      parishId, householdId: `family-${suffix}`, userId: null,
      household: { parishId, guardians: suffix === 'b' ? [{ userId: 'actor' }] : [] },
      enrollments: [{ classId: `class-${suffix}`, class: { id: `class-${suffix}`, parishId } }] };
  });
  const rows: Record<string, any[]> = {
    CatechumenProfile: profiles,
    Household: profiles.map(p => ({ id: p.householdId, name: 'Sintetica', parishId: p.parishId, catechumens: [p], guardians: p.household.guardians })),
    SacramentalJourney: profiles.map(p => ({ id: `journey-${p.id}`, catechumenProfile: p })),
    Document: profiles.map(p => ({ id: `document-${p.id}`, name: 'Sintetica', catechumenProfile: p })),
  };
  const entities: any = {
    Membership: {
      findMany: vi.fn(async () => Object.entries(roles).map(([parishId, role]) => ({ parishId, role }))),
      findFirst: vi.fn(async ({ where }) => roles[where.parishId] ? { id: 'membership', role: roles[where.parishId] } : null),
    },
    Parish: { findFirst: vi.fn(async () => null), findMany: vi.fn(async () => []) },
    ClassCatechist: { findMany: vi.fn(async () => assigned.map(classId => ({ classId }))) },
    GuardianProfile: { findMany: vi.fn(async () => [{ householdId: 'family-b' }]) },
  };
  for (const name of ['CatechumenProfile', 'Household', 'SacramentalJourney', 'Document', 'CatechesisClass', 'ContentItem', 'Community']) {
    entities[name] = { findMany: vi.fn(async ({ where }) => (rows[name] ?? []).filter(row => matches(row, where))) };
  }
  return { user: { id: 'actor', isAdmin: admin }, entities };
}
const idsFor = (s: string) => [`student-${s}`, `family-${s}`, `journey-student-${s}`, `document-student-${s}`];
async function search(context: any) {
  return (await globalSearch({ query: 'Sintetica' }, context)).map(r => r.id);
}
describe('C-10: categorias pessoais da busca global', () => {
  it.each(['catechumen', 'family', 'sacrament', 'document'])('recusa outra turma na categoria %s e preserva a atribuída', async (type) => {
    const results = await globalSearch({ query: 'Sintetica' }, fixture({ 'parish-a': 'LEAD_CATECHIST' }));
    const ids = results.filter(r => r.type === type).map(r => r.id);
    expect(ids).toHaveLength(1);
    expect(idsFor('a')).toContain(ids[0]);
    for (const id of [...idsFor('b'), ...idsFor('c')]) expect(ids).not.toContain(id);
  });
  it('catequista sem atribuição não recebe dados pessoais', async () => {
    expect(await search(fixture({ 'parish-a': 'LEAD_CATECHIST' }, []))).toEqual([]);
  });
  it('coordenação mantém a visão da paróquia', async () => {
    const ids = await search(fixture({ 'parish-a': 'PARISH_COORDINATOR' }));
    expect(ids).toEqual(expect.arrayContaining([...idsFor('a'), ...idsFor('b')]));
    for (const id of idsFor('c')) expect(ids).not.toContain(id);
  });
  it('responsável encontra somente o próprio agregado', async () => {
    const ids = await search(fixture({ 'parish-a': 'GUARDIAN' }));
    expect(ids).toEqual(expect.arrayContaining(idsFor('b')));
    for (const id of [...idsFor('a'), ...idsFor('c')]) expect(ids).not.toContain(id);
  });
  it('coordenação em outra paróquia não amplia o escopo familiar', async () => {
    const ids = await search(fixture({ 'parish-a': 'GUARDIAN', 'parish-b': 'PARISH_COORDINATOR' }));
    expect(ids).toEqual(expect.arrayContaining([...idsFor('b'), ...idsFor('c')]));
    for (const id of idsFor('a')) expect(ids).not.toContain(id);
  });
  it('admin mantém acesso global', async () => {
    expect(await search(fixture({}, [], true))).toEqual(expect.arrayContaining(['a', 'b', 'c'].flatMap(idsFor)));
  });
});
