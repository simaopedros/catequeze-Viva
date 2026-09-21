export function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDay(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function formatRelative(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (days === 0) return `Hoje · ${formatWhen(value)}`;
  if (days === 1) return `Amanhã · ${formatWhen(value)}`;
  if (days === -1) return `Ontem · ${formatWhen(value)}`;
  return formatWhen(value);
}

export function sameDay(a?: string | Date | null, b?: string | Date | null) {
  if (!a || !b) return false;
  const left = a instanceof Date ? a : new Date(a);
  const right = b instanceof Date ? b : new Date(b);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function personName(row: any, fallback = 'Sem nome') {
  if (!row) return fallback;
  return (
    row.displayName ||
    row.name ||
    [row.firstName, row.lastName].filter(Boolean).join(' ') ||
    fallback
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

export function asList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.classes)) return payload.classes;
  if (Array.isArray(payload?.conversations)) return payload.conversations;
  if (Array.isArray(payload?.participants)) return payload.participants;
  return [];
}
