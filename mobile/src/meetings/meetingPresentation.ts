export type MeetingMaterialKind = 'pdf' | 'video' | 'bible' | 'file';

export type MeetingMaterialRow = {
  id: string;
  label: string;
  kind: MeetingMaterialKind;
};

function classifyMaterialLine(line: string): MeetingMaterialKind {
  const lower = line.toLowerCase();
  if (lower.endsWith('.pdf') || lower.includes('.pdf')) return 'pdf';
  if (lower.startsWith('vídeo') || lower.startsWith('video') || lower.includes('youtube') || lower.includes('.mp4')) {
    return 'video';
  }
  if (lower.includes('passagem') || lower.includes('bíblia') || lower.includes('biblia')) return 'bible';
  return 'file';
}

export function parseMaterialLines(raw?: string | null): MeetingMaterialRow[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
    .map((label, index) => ({
      id: `line-${index}`,
      label,
      kind: classifyMaterialLine(label),
    }));
}

export function buildMaterialRows(meeting: {
  content?: { materials?: string | null; biblicalRef?: string | null } | null;
}): MeetingMaterialRow[] {
  const rows = parseMaterialLines(meeting.content?.materials);
  const ref = meeting.content?.biblicalRef?.trim();
  if (ref && !rows.some((r) => r.label.includes(ref))) {
    rows.push({
      id: 'biblical-ref',
      label: ref.startsWith('Passagem') ? ref : `Passagem bíblica: ${ref}`,
      kind: 'bible',
    });
  }
  return rows;
}

export function formatMeetingSchedule(
  dateInput?: string | null,
  durationMinutes?: number | null,
): string {
  if (!dateInput) return 'Data a definir';
  const start = new Date(dateInput);
  if (Number.isNaN(start.getTime())) return String(dateInput);

  const duration = typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : 90;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const day = start.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const fmt = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dayLabel = day.replace(/\./g, '').replace(/\sde\s/gi, ' ');
  return `${dayLabel} • ${fmt(start)} - ${fmt(end)}`;
}

export function meetingThemeLabel(meeting: {
  theme?: string | null;
  title?: string | null;
  content?: { theme?: string | null; title?: string | null } | null;
}): string {
  const theme = meeting.theme || meeting.content?.theme || meeting.title || meeting.content?.title;
  if (!theme) return 'Tema a definir';
  if (/^tema:/i.test(theme)) return theme;
  return `Tema: ${theme}`;
}

export function meetingSummaryText(meeting: {
  details?: string | null;
  notes?: string | null;
  content?: {
    pastoralObjective?: string | null;
    mainContent?: string | null;
  } | null;
}): string | null {
  const candidates = [
    meeting.details,
    meeting.notes,
    meeting.content?.pastoralObjective,
    meeting.content?.mainContent,
  ];
  for (const text of candidates) {
    const trimmed = text?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}
