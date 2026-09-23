export type HomeAlertItem = {
  type?: string;
  message?: string;
  meta?: string;
  /** Quando definido, alertas de presença abrem esta chamada. */
  meetingId?: string;
  catechumenId?: string;
};

export type HomeAlertTarget =
  | { screen: 'messages' }
  | { screen: 'notifications' }
  | { screen: 'classes' }
  | { screen: 'catechumens' }
  | { screen: 'attendance'; meetingId: string }
  | null;

export function resolveHomeAlertTarget(
  alert: HomeAlertItem,
  options?: { todayMeetingId?: string },
): HomeAlertTarget {
  const type = (alert.type || '').toLowerCase();
  const text = `${alert.message || ''} ${alert.meta || ''}`.toLowerCase();

  if (alert.meetingId) {
    return { screen: 'attendance', meetingId: alert.meetingId };
  }

  if (type === 'birthday' || text.includes('anivers')) {
    return { screen: 'catechumens' };
  }

  if (type === 'message' || text.includes('mensagem')) {
    return { screen: 'messages' };
  }

  const attendanceHint =
    text.includes('presença') ||
    text.includes('presenca') ||
    text.includes('chamada') ||
    text.includes('registar');

  if (attendanceHint || type === 'warning') {
    if (options?.todayMeetingId) {
      return { screen: 'attendance', meetingId: options.todayMeetingId };
    }
    if (attendanceHint) {
      return { screen: 'classes' };
    }
  }

  if (text.includes('rascunho') || (text.includes('turma') && !text.includes('mensagem'))) {
    return { screen: 'classes' };
  }

  if (type === 'info') {
    return { screen: 'classes' };
  }

  return { screen: 'notifications' };
}
