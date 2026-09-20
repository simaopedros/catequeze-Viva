export function formatWhen(value?: string | number | Date | null) {
  if (value === undefined || value === null || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDay(value?: string | number | Date | null) {
  if (value === undefined || value === null || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR', { dateStyle: 'medium' });
}

export function asItems(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['items', 'data', 'results', 'rows']) {
      if (Array.isArray(record[key])) return record[key] as any[];
    }
  }
  return [];
}

export function displayPerson(item: { firstName?: string; lastName?: string; name?: string; email?: string }) {
  const name = [item.firstName, item.lastName].filter(Boolean).join(' ').trim();
  return name || item.name || item.email || 'Sem nome';
}
