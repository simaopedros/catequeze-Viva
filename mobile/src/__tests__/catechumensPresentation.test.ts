import { filterCatechumenRowsByClass } from '../catechumens/catechumensPresentation';

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
