import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { formatDate } from '../lib/payload';
import { colors } from '../theme';

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
      {items.map((item) => {
        const inner = (
          <Card>
            <Text style={{ color: colors.goldDark, fontWeight: '700', fontSize: 12 }}>
              {item.kind === 'meeting' ? 'Encontro' : 'Evento litúrgico'}
            </Text>
            <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17, marginTop: 4 }}>{item.title}</Text>
            {item.subtitle ? (
              <Text style={{ color: colors.muted, marginTop: 4 }}>{item.subtitle}</Text>
            ) : null}
            {item.date ? (
              <Text style={{ color: colors.muted, marginTop: 4 }}>{formatDate(item.date)}</Text>
            ) : null}
          </Card>
        );
        if (item.kind === 'meeting' && onOpenMeeting) {
          return (
            <Pressable key={`${item.kind}-${item.id}`} testID={`item-${item.id}`} onPress={() => onOpenMeeting(item.id)}>
              {inner}
            </Pressable>
          );
        }
        return <React.Fragment key={`${item.kind}-${item.id}`}>{inner}</React.Fragment>;
      })}
    </Screen>
  );
}
