import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { monthRange, startOfMonth } from '../../src/calendar/calendarMonth';
import { useAsync } from '../../src/hooks/useAsync';
import { CalendarScreen } from '../../src/screens/CalendarScreen';

function unwrapClasses(payload: unknown): { id: string; name?: string }[] {
  if (Array.isArray(payload)) return payload as { id: string; name?: string }[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)) {
    return (payload as { items: { id: string; name?: string }[] }).items;
  }
  return [];
}

export default function CalendarRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [busy, setBusy] = useState(false);
  const range = useMemo(() => monthRange(month), [month]);

  const { data, loading, error, reload } = useAsync(
    () => api.calendar(workspaceId || undefined, range.from, range.to),
    [workspaceId, range.from, range.to],
  );

  const classesQuery = useAsync(
    () => api.classes(workspaceId || undefined),
    [workspaceId],
  );

  return (
    <CalendarScreen
      items={data?.items ?? []}
      canWriteEvents={data?.canWriteEvents ?? false}
      loading={loading}
      error={error}
      month={month}
      onMonthChange={setMonth}
      classes={unwrapClasses(classesQuery.data)}
      busy={busy}
      refreshing={loading}
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
      onReload={() => void reload()}
      onCreateLiturgicalEvent={async (draft) => {
        setBusy(true);
        try {
          await api.createCalendarEvent({ ...draft, workspaceId: workspaceId || undefined });
        } finally {
          setBusy(false);
        }
      }}
      onUpdateLiturgicalEvent={async (id, draft) => {
        setBusy(true);
        try {
          await api.updateCalendarEvent(id, draft);
        } finally {
          setBusy(false);
        }
      }}
      onDeleteLiturgicalEvent={async (id) => {
        setBusy(true);
        try {
          await api.deleteCalendarEvent(id);
        } finally {
          setBusy(false);
        }
      }}
      onCreateMeeting={async (draft) => {
        setBusy(true);
        try {
          await api.createMeeting(draft);
        } finally {
          setBusy(false);
        }
      }}
      onUpdateMeeting={async (id, draft) => {
        setBusy(true);
        try {
          await api.updateMeeting(id, draft);
        } finally {
          setBusy(false);
        }
      }}
      onDeleteMeeting={async (id) => {
        setBusy(true);
        try {
          await api.deleteMeeting(id);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
