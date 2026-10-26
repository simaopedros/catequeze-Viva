import { describe, expect, it } from 'vitest';
import {
  catechismDisplayText,
  catechismPreview,
  toBrazilianSpelling,
} from '../shared/catechismText';

describe('toBrazilianSpelling', () => {
  it('drops silent consonants and keeps capitalization', () => {
    expect(toBrazilianSpelling('A participação activa na acção de graças')).toBe(
      'A participação ativa na ação de graças',
    );
    expect(toBrazilianSpelling('O Baptismo é o fundamento')).toBe(
      'O Batismo é o fundamento',
    );
    expect(toBrazilianSpelling('Os actos e o objectivo actual')).toBe(
      'Os atos e o objetivo atual',
    );
    expect(toBrazilianSpelling('Deus está connosco, de facto.')).toBe(
      'Deus está conosco, de fato.',
    );
  });

  it('leaves Brazilian words untouched', () => {
    const text = 'A concepção, a recepção e a percepção do fato.';
    expect(toBrazilianSpelling(text)).toBe(text);
    expect(toBrazilianSpelling('ativa atual ação')).toBe('ativa atual ação');
  });

  it('only applies to pt-BR', () => {
    expect(catechismDisplayText('acção', 'pt-BR')).toBe('ação');
    expect(catechismDisplayText('acción', 'es')).toBe('acción');
  });
});

describe('catechismPreview', () => {
  it('marks truncated questions as excerpts ending on a word', () => {
    const answer =
      'Deus, infinitamente perfeito e bem-aventurado em si mesmo, num desígnio de pura bondade criou livremente o homem. Por isso, em todos os tempos e lugares.';
    const preview = catechismPreview({ question: answer.slice(0, 120), answer });
    expect(preview.isExcerpt).toBe(true);
    expect(preview.title.endsWith('…')).toBe(true);
    expect(answer.startsWith(preview.title.slice(0, -1))).toBe(true);
  });

  it('keeps real questions', () => {
    expect(
      catechismPreview({ question: 'O que é a fé?', answer: 'A fé é...' }),
    ).toEqual({ title: 'O que é a fé?', isExcerpt: false });
  });
});
