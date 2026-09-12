import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { pickItems, personName } from '../../../src/lib/payload';
import { CalendarScreen, type CalendarItem } from '../../../src/screens/CalendarScreen';

export default function CalendarTabRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => api.calendar(workspaceId || undefined),
    [workspaceId],
  );

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
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
    />
  );
}
