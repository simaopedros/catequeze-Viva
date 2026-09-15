import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { canCreateCalendarEvent } from '../../../src/lib/roleAccess';
import { pickItems, personName } from '../../../src/lib/payload';
import { appRoutes } from '../../../src/navigation/routes';
import { CalendarScreen, type CalendarItem } from '../../../src/screens/CalendarScreen';

export default function CalendarTabRoute() {
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(
    () => api.calendar(workspaceId || undefined),
    [workspaceId],
  );
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const canWrite = canCreateCalendarEvent(nav.role, nav.isAdmin);

  const events = pickItems(data, 'events');
  const meetings = pickItems(data, 'meetings');
  const items: CalendarItem[] = [
    ...meetings.map((row: any) => ({
      id: row.id,
      kind: 'meeting' as const,
      title: row.title || row.theme || 'Encontro',
      subtitle: row.class?.name || 'Turma',
      date: row.date || row.startsAt,
    })),
    ...events.map((row: any) => ({
      id: row.id,
      kind: 'event' as const,
      title: personName(row, row.name || 'Evento'),
      subtitle: row.kind || row.type || 'Litúrgico',
      date: row.date || row.startsAt,
    })),
  ].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return aTime - bTime;
  });

  return (
    <CalendarScreen
      items={items}
      loading={loading}
      error={error}
      canWrite={canWrite}
      onCreate={() => router.push(appRoutes.form('event'))}
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
      onDeleteEvent={(id) => {
        Alert.alert('Apagar evento', 'Remover este evento litúrgico?', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Apagar',
            style: 'destructive',
            onPress: async () => {
              await api.deleteCalendarEvent(id);
              await reload();
            },
          },
        ]);
      }}
    />
  );
}
