const DATE_TIME = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const DATE_ONLY = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });

const TIME_ONLY = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' });

function parse(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value?: string | Date | null): string {
  const date = parse(value);
  if (!date) return typeof value === 'string' ? value : '';
  return DATE_TIME.format(date);
}

export function formatDate(value?: string | Date | null): string {
  const date = parse(value);
  if (!date) return typeof value === 'string' ? value : '';
  return DATE_ONLY.format(date);
}

export function formatTime(value?: string | Date | null): string {
  const date = parse(value);
  if (!date) return '';
  return TIME_ONLY.format(date);
}

/** "há 5 min", "há 2 h", "ontem", ou data curta. */
export function formatRelative(value?: string | Date | null): string {
  const date = parse(value);
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return formatDate(date);
}

export function fullName(person?: { firstName?: string | null; lastName?: string | null; email?: string | null; name?: string | null } | null, fallback = ''): string {
  if (!person) return fallback;
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
  return name || person.name || person.email || fallback;
}

export function toDateInputValue(value?: string | Date | null): string {
  const date = parse(value);
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}
