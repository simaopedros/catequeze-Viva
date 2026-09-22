export type HomeAlertItem = {
  type?: string;
  message?: string;
  meta?: string;
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

  if (type === 'birthday' || text.includes('anivers')) {
    return { screen: 'catechumens' };
  }

  if (type === 'message' || text.includes('mensagem')) {
    return { screen: 'messages' };
  }

  if (text.includes('turma') || text.includes('rascunho')) {
    return { screen: 'classes' };
  }

  if (text.includes('presença') || text.includes('presenca') || type === 'warning') {
    if (options?.todayMeetingId) {
      return { screen: 'attendance', meetingId: options.todayMeetingId };
    }
    return { screen: 'classes' };
  }

  if (type === 'info') {
    return { screen: 'notifications' };
  }

  return { screen: 'notifications' };
}
