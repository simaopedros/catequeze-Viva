import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, EmptyState, ErrorState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { formatWhen, sameDay } from '../format';
import { colors, type } from '../theme';

type AgendaItem = {
  id: string;
  title: string;
  at?: string;
  kind: 'meeting' | 'liturgy';
};

function monthGrid(anchor: Date) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = (start.getDay() + 6) % 7;
  const cells: Date[] = [];
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start);
    day.setDate(1 - offset + index);
    cells.push(day);
  }
  return cells;
}

export function CalendarScreen({
  events,
  meetings,
  loading,
  error,
  onOpenMeeting,
}: {
  events: any[];
  meetings: any[];
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const cells = useMemo(() => monthGrid(cursor), [cursor]);
  const items = useMemo<AgendaItem[]>(() => {
    const liturgical = (events || []).map((event) => ({
      id: event.id,
      title: event.name || event.title || 'Festa litúrgica',
      at: event.date,
      kind: 'liturgy' as const,
    }));
    const classes = (meetings || []).map((meeting) => ({
      id: meeting.id,
      title: meeting.title || meeting.theme || meeting.name || 'Encontro',
      at: meeting.date || meeting.startsAt,
      kind: 'meeting' as const,
    }));
    return [...liturgical, ...classes];
  }, [events, meetings]);
  const dayItems = items.filter((item) => sameDay(item.at, selected));
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(cursor);

  return (
    <Screen testID="calendar-screen">
      <ScreenTitle title="Agenda" subtitle="Encontros da turma e o calendário litúrgico." />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Pressable
          onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: colors.goldDark, fontFamily: type.bodyBold }}>Mês anterior</Text>
        </Pressable>
        <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>{label}</Text>
        <Pressable
          onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: colors.goldDark, fontFamily: type.bodyBold }}>Próximo</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const active = sameDay(day, selected);
          const marked = items.some((item) => sameDay(item.at, day));
          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => setSelected(day)}
              style={{
                width: '14.28%',
                aspectRatio: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                backgroundColor: active ? colors.ink : 'transparent',
              }}
            >
              <Text style={{ color: active ? colors.cream : inMonth ? colors.ink : colors.inkMuted, fontFamily: type.bodyMedium }}>
                {day.getDate()}
              </Text>
              {marked ? (
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: active ? colors.gold : colors.goldDark }} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Agenda indisponível" body={error} /> : null}
      {dayItems.length === 0 && !loading ? (
        <EmptyState title="Dia livre" body="Não há encontro nem festa neste dia." />
      ) : (
        dayItems.map((item) => (
          <Pressable key={`${item.kind}-${item.id}`} onPress={() => item.kind === 'meeting' && onOpenMeeting(item.id)}>
            <Card>
              <Text style={{ color: colors.goldDark, fontFamily: type.bodyBold, fontSize: 12 }}>
                {item.kind === 'meeting' ? 'Encontro' : 'Liturgia'}
              </Text>
              <Text style={{ color: colors.ink, fontFamily: type.bodyBold, marginTop: 4 }}>{item.title}</Text>
              <Text style={{ color: colors.muted, fontFamily: type.body, marginTop: 4 }}>{formatWhen(item.at)}</Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
