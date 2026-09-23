export type CatechismPartKey =
  | 'creed'
  | 'sacraments'
  | 'commandments'
  | 'prayer'
  | 'virtues'
  | 'sin';

export const MIN_CATECHISM_SEARCH_LENGTH = 3;

export const CATECHISM_PARTS: {
  key: CatechismPartKey;
  title: string;
  summary: string;
}[] = [
  { key: 'creed', title: 'O Credo', summary: 'Fé, Igreja e vida cristã' },
  { key: 'sacraments', title: 'Os Sacramentos', summary: 'Graça e celebração' },
  { key: 'commandments', title: 'Os Mandamentos', summary: 'Moral e deveres' },
  { key: 'prayer', title: 'A Oração', summary: 'Falar com Deus' },
  { key: 'virtues', title: 'As Virtudes', summary: 'Crescer em santidade' },
  { key: 'sin', title: 'O Pecado', summary: 'Conversão e misericórdia' },
];

const TITLE_BY_KEY = Object.fromEntries(CATECHISM_PARTS.map((p) => [p.key, p.title])) as Record<
  string,
  string
>;

export function catechismCategoryTitle(category?: string | null): string {
  if (!category) return 'Catecismo';
  return TITLE_BY_KEY[category] ?? category;
}

export function formatCatechismQuestionPreview(text?: string | null, maxLength = 88): string {
  const raw = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return 'Entrada do Catecismo';
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength - 1)}…`;
}

export type CatechismListEntry = {
  number?: number;
  id?: string;
  question?: string;
  title?: string;
  category?: string;
};

export function catechismEntryListTitle(entry: CatechismListEntry): string {
  const preview = formatCatechismQuestionPreview(entry.question || entry.title);
  if (entry.number != null) {
    return `${entry.number}. ${preview}`;
  }
  return preview;
}
