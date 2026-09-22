export type CatechumenListItem = {
  id: string;
  name: string;
  className?: string;
  familyName?: string;
  initials: string;
};

export function asCatechumenRows(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown[] }).items)) {
    return (payload as { items: any[] }).items;
  }
  return [];
}

export function catechumenDisplayName(row: any): string {
  const full = [row?.firstName, row?.lastName].filter(Boolean).join(' ').trim();
  return full || row?.displayName || row?.name || 'Catequizando';
}

export function catechumenClassName(row: any): string | undefined {
  const fromEnrollment = row?.enrollments?.find((e: any) => e?.class?.name)?.class?.name;
  return fromEnrollment || row?.class?.name || row?.className || undefined;
}

export function catechumenFamilyName(row: any): string | undefined {
  return row?.household?.name || row?.familyName || undefined;
}

export function catechumenInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function mapCatechumenListItem(row: any): CatechumenListItem {
  const name = catechumenDisplayName(row);
  return {
    id: String(row.id),
    name,
    className: catechumenClassName(row),
    familyName: catechumenFamilyName(row),
    initials: catechumenInitials(name),
  };
}

export function filterCatechumensByQuery(rows: CatechumenListItem[], query: string): CatechumenListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const haystack = [row.name, row.className, row.familyName].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
}
