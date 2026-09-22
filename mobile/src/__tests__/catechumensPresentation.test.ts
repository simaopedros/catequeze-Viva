import {
  asCatechumenRows,
  catechumenClassName,
  filterCatechumensByQuery,
  mapCatechumenListItem,
} from '../catechumens/catechumensPresentation';

describe('catechumensPresentation', () => {
  it('normalizes API payloads', () => {
    expect(asCatechumenRows([{ id: '1' }])).toHaveLength(1);
    expect(asCatechumenRows({ items: [{ id: '2' }] })).toHaveLength(1);
    expect(asCatechumenRows({})).toEqual([]);
  });

  it('maps class name from enrollments', () => {
    const row = {
      id: 'p1',
      firstName: 'Ana',
      lastName: 'Silva',
      enrollments: [{ class: { name: '3A — Crisma' } }],
      household: { name: 'Família Silva' },
    };
    expect(catechumenClassName(row)).toBe('3A — Crisma');
    expect(mapCatechumenListItem(row)).toMatchObject({
      id: 'p1',
      name: 'Ana Silva',
      className: '3A — Crisma',
      familyName: 'Família Silva',
      initials: 'AS',
    });
  });

  it('filters by name, class, or family', () => {
    const rows = [
      mapCatechumenListItem({ id: '1', firstName: 'João', lastName: 'Santos', enrollments: [{ class: { name: 'Turma A' } }] }),
      mapCatechumenListItem({ id: '2', firstName: 'Maria', lastName: 'Lima', household: { name: 'Família Lima' } }),
    ];
    expect(filterCatechumensByQuery(rows, 'turma a')).toHaveLength(1);
    expect(filterCatechumensByQuery(rows, 'lima')).toHaveLength(1);
  });
});
