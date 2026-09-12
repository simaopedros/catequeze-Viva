import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems, formatDate, personName } from '../../src/lib/payload';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function CalendarRoute() {
  const { api, workspaceId } = useAuth();
  const { data, loading, error } = useAsync(
    () => api.calendar(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data, ['events']).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Evento'),
    subtitle: [formatDate(row.startsAt || row.date), row.kind || row.type].filter(Boolean).join(' · '),
  }));

  return (
    <CatalogScreen
      testID="calendar-screen"
      title="Calendário"
      subtitle="Eventos litúrgicos deste espaço."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Calendário vazio"
      emptyBody="Ainda não há eventos litúrgicos neste espaço."
    />
  );
}
