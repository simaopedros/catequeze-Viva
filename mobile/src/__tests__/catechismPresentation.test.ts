import {
  CATECHISM_PARTS,
  catechismCategoryTitle,
  catechismEntryListTitle,
  formatCatechismQuestionPreview,
} from '../catechism/catechismPresentation';

describe('catechismPresentation', () => {
  it('usa chaves de categoria alinhadas ao backend (creed, sacraments, …)', () => {
    expect(CATECHISM_PARTS.map((p) => p.key)).toEqual([
      'creed',
      'sacraments',
      'commandments',
      'prayer',
      'virtues',
      'sin',
    ]);
  });

  it('resolve títulos em português', () => {
    expect(catechismCategoryTitle('creed')).toBe('O Credo');
    expect(catechismCategoryTitle('prayer')).toBe('A Oração');
  });

  it('formata título de lista com número', () => {
    const title = catechismEntryListTitle({
      number: 1,
      question: 'Deus, infinitamente perfeito',
    });
    expect(title).toMatch(/^1\./);
  });

  it('encurta perguntas longas', () => {
    const long = 'a'.repeat(120);
    expect(formatCatechismQuestionPreview(long).length).toBeLessThan(120);
  });
});
