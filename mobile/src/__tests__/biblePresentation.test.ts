import type { BibleBook } from '../api/types';
import {
  bibleTestamentLabel,
  booksForTestament,
  filterBibleBooks,
  partitionBibleBooks,
} from '../bible/biblePresentation';

const sample: BibleBook[] = [
  { id: 'gn', name: 'Gênesis', testament: 'OT', position: 1 },
  { id: 'mt', name: 'Mateus', testament: 'NT', position: 47 },
  { id: 'jo', name: 'João', testament: 'NT', position: 50 },
];

describe('biblePresentation', () => {
  it('particiona AT e NT', () => {
    const { ot, nt } = partitionBibleBooks(sample);
    expect(ot).toHaveLength(1);
    expect(nt).toHaveLength(2);
  });

  it('filtra por testamento', () => {
    expect(booksForTestament(sample, 'OT')).toHaveLength(1);
    expect(booksForTestament(sample, 'NT')).toHaveLength(2);
  });

  it('pesquisa por nome ou id', () => {
    expect(filterBibleBooks(sample, 'jo')).toHaveLength(1);
    expect(filterBibleBooks(sample, 'mateus')[0].id).toBe('mt');
  });

  it('traduz etiqueta de testamento', () => {
    expect(bibleTestamentLabel('OT')).toBe('Antigo Testamento');
    expect(bibleTestamentLabel('NT')).toBe('Novo Testamento');
  });
});
