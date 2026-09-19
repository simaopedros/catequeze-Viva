import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { useAuth, usePermissions } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asClassList } from '../../../src/screens/ClassesScreen';
import { CalendarScreen, type CalendarItem } from '../../../src/screens/CalendarScreen';

export default function CalendarRoute() {
  const { api, workspaceId } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const events = useAsync(() => api.calendarEvents(workspaceId || undefined), [workspaceId]);
  const classes = useAsync(() => api.classes(workspaceId || undefined), [workspaceId]);
  const meetings = useAsync(async () => {
    const list = asClassList(classes.data);
    if (list.length === 0) return [];
    const results = await Promise.all(list.map((item) => api.meetings(item.id).catch(() => [])));
    return results.flatMap((payload: any, index) => {
      const rows = Array.isArray(payload) ? payload : payload?.items ?? [];
      return rows.map((meeting: any) => ({ ...meeting, className: list[index].name, classId: list[index].id }));
    });
  }, [classes.data]);

  useFocusEffect(
    useCallback(() => {
      void events.reload();
    }, [events.reload]),
  );

  const items = useMemo<CalendarItem[]>(() => {
    const eventItems: CalendarItem[] = (Array.isArray(events.data) ? events.data : []).map((event: any) => ({
      id: event.id,
      name: event.name,
      description: event.description,
      date: event.date,
      endDate: event.endDate,
      type: event.type,
      color: event.color,
      kind: 'event',
    }));
    const meetingItems: CalendarItem[] = (meetings.data ?? []).map((meeting: any) => ({
      id: meeting.id,
      meetingId: meeting.id,
      name: meeting.title || meeting.theme || 'Encontro',
      date: meeting.date || meeting.startsAt,
      kind: 'meeting',
      classId: meeting.classId,
      className: meeting.className,
    }));
    return [...eventItems, ...meetingItems];
  }, [events.data, meetings.data]);

  return (
    <CalendarScreen
      items={items}
      loading={events.loading || classes.loading}
      error={events.error}
      refreshing={events.refreshing}
      onRefresh={() => void Promise.all([events.reload(), meetings.reload()])}
      onOpenMeeting={(meetingId) => router.push(`/(app)/meeting/${meetingId}`)}
      onCreate={permissions.canManageClasses ? () => router.push('/(app)/calendar/new') : undefined}
    />
  );
}
