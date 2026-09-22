import {
  asCatechumenRows,
  catechumenClassName,
  filterCatechumenRowsByClass,
  filterCatechumensByQuery,
  formatBirthDate,
  mapCatechumenDetail,
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
      enrollments: [{ class: { name: 'Turma 3A' } }],
    };
    expect(mapCatechumenListItem(row).className).toBe('Turma 3A');
    expect(catechumenClassName(row)).toBe('Turma 3A');
  });

  it('filters by search query', () => {
    const rows = [
      { id: '1', name: 'Ana', className: '3A', familyName: 'Silva', initials: 'AS' },
      { id: '2', name: 'Bruno', className: '2B', familyName: 'Costa', initials: 'BC' },
    ];
    expect(filterCatechumensByQuery(rows, 'silva')).toHaveLength(1);
  });

  it('formats birth date', () => {
    const formatted = formatBirthDate('2020-05-10');
    expect(formatted.label).toMatch(/2020/);
    expect(formatted.ageYears).toBeGreaterThan(0);
  });

  it('maps detail view', () => {
    const detail = mapCatechumenDetail({
      id: 'p1',
      firstName: 'Ana',
      lastName: 'Silva',
      enrollments: [{ class: { id: 'c1', name: '3A' } }],
    });
    expect(detail.name).toBe('Ana Silva');
    expect(detail.enrollments[0]?.className).toBe('3A');
  });
});

describe('filterCatechumenRowsByClass', () => {
  it('keeps only enrollments for the class', () => {
    const rows = [
      { id: 'a', enrollments: [{ class: { id: 'c1' } }] },
      { id: 'b', enrollments: [{ classId: 'c2' }] },
      { id: 'c', enrollments: [{ class: { id: 'c1' } }, { class: { id: 'c2' } }] },
    ];
    expect(filterCatechumenRowsByClass(rows, 'c1').map((r) => r.id)).toEqual(['a', 'c']);
  });
});
