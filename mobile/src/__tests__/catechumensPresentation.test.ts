import {
  asCatechumenRows,
  catechumenClassName,
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

  it('maps detail profile with guardians and journeys', () => {
    const detail = mapCatechumenDetail({
      id: 'p9',
      firstName: 'João',
      lastName: 'Souza',
      birthDate: '2010-01-15T12:00:00.000Z',
      enrollments: [{ class: { id: 'c2', name: 'Turma B', stage: { name: 'Eucaristia' } } }],
      household: {
        id: 'h2',
        name: 'Família Souza',
        guardians: [{ id: 'g1', user: { firstName: 'Paulo', lastName: 'Souza' } }],
      },
      sacramentalJourneys: [{ id: 'j1', template: { name: 'Primeira Eucaristia' }, milestones: [] }],
      documents: [],
    });
    expect(detail).toMatchObject({
      name: 'João Souza',
      enrollments: [{ classId: 'c2', className: 'Turma B', stageName: 'Eucaristia' }],
      householdId: 'h2',
      guardians: [{ name: 'Paulo Souza' }],
      journeys: [{ name: 'Primeira Eucaristia', milestoneCount: 0 }],
    });
    expect(formatBirthDate('2010-01-15T12:00:00.000Z').ageYears).toBeGreaterThan(10);
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
