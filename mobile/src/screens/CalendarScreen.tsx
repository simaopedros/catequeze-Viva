import React from 'react';
import { EmptyState, LoadingState, PersonRow, Screen, ScreenTitle } from '../components/ui';
import { formatDate } from '../lib/payload';

export type CalendarItem = {
  id: string;
  kind: 'meeting' | 'event';
  title: string;
  subtitle?: string;
  date?: string;
};

export function CalendarScreen({
  items,
  loading,
  error,
  onOpenMeeting,
}: {
  items: CalendarItem[];
  loading?: boolean;
  error?: string | null;
  onOpenMeeting?: (id: string) => void;
}) {
  return (
    <Screen testID="calendar-screen">
      <ScreenTitle title="Calendário" subtitle="Encontros da turma e eventos litúrgicos deste espaço." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Não foi possível carregar" body={error} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="Calendário vazio"
          body="Ainda não há encontros nem eventos litúrgicos neste espaço."
        />
      ) : null}
      {items.map((item) => (
        <PersonRow
          key={`${item.kind}-${item.id}`}
          testID={`item-${item.id}`}
          name={item.title}
          hint={[item.kind === 'meeting' ? 'Encontro' : 'Evento litúrgico', item.subtitle, formatDate(item.date)]
            .filter(Boolean)
            .join(' · ')}
          onPress={item.kind === 'meeting' && onOpenMeeting ? () => onOpenMeeting(item.id) : undefined}
        />
      ))}
    </Screen>
  );
}
