import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Card,
  EmptyState,
  EncounterCard,
  ErrorState,
  LoadingState,
  MetricTile,
  Screen,
  ScreenTitle,
  SectionHeader,
} from '../components/ui';
import { formatRelative, formatWhen } from '../format';
import { colors, type } from '../theme';

type Meeting = {
  id: string;
  title?: string;
  theme?: string;
  startsAt?: string;
  date?: string;
  class?: { name?: string };
};

export function HomeScreen({
  name,
  workspace,
  stats,
  meetings,
  loading,
  error,
  onOpenMeeting,
  onOpenAttendance,
  onOpenClasses,
  onOpenCatechumens,
  onOpenCalendar,
  onRefresh,
}: {
  name: string;
  workspace?: string;
  stats?: {
    activeClasses?: number;
    activeCatechumens?: number;
    avgAttendance?: number;
    upcomingMeetings?: Meeting[];
    todayMeetings?: Meeting[];
  } | null;
  meetings?: Meeting[];
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
  onOpenAttendance: (id: string) => void;
  onOpenClasses: () => void;
  onOpenCatechumens: () => void;
  onOpenCalendar: () => void;
  onRefresh?: () => void;
}) {
  const today = stats?.todayMeetings ?? [];
  const focus = today[0];
  const upcoming = (meetings ?? stats?.upcomingMeetings ?? []).filter((item) => item.id !== focus?.id).slice(0, 5);
  const when = focus?.startsAt || focus?.date;

  return (
    <Screen testID="home-screen" refreshing={loading} onRefresh={onRefresh}>
      <ScreenTitle title={`Olá, ${name}`} subtitle={workspace || 'O essencial da catequese, no bolso.'} />
      {loading && !stats ? <LoadingState /> : null}
      {error ? <ErrorState title="Não foi possível carregar o início" body={error} /> : null}
      {focus ? (
        <EncounterCard
          testID={`meeting-${focus.id}`}
          title={focus.title || focus.theme || 'Encontro'}
          meta={[focus.class?.name || 'Turma', formatWhen(when)].filter(Boolean).join(' · ')}
          actionLabel="Fazer a chamada"
          onAction={() => onOpenAttendance(focus.id)}
          onPress={() => onOpenMeeting(focus.id)}
        />
      ) : !loading ? (
        <EmptyState title="Sem encontro hoje" body="Quando houver um encontro marcado para hoje, a chamada fica aqui." />
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <MetricTile label="Turmas" value={stats?.activeClasses ?? '—'} onPress={onOpenClasses} testID="metric-classes" />
        <MetricTile
          label="Catequizandos"
          value={stats?.activeCatechumens ?? '—'}
          onPress={onOpenCatechumens}
          testID="metric-catechumens"
        />
        <MetricTile label="Presença" value={stats?.avgAttendance != null ? `${stats.avgAttendance}%` : '—'} />
      </View>
      <SectionHeader title="Próximos encontros" />
      {upcoming.length === 0 && !loading ? (
        <EmptyState title="Agenda livre" body="Os próximos encontros aparecem nesta linha do tempo." />
      ) : (
        upcoming.map((meeting) => (
          <Pressable key={meeting.id} onPress={() => onOpenMeeting(meeting.id)} testID={`meeting-${meeting.id}`}>
            <Card>
              <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>
                {meeting.title || meeting.theme || 'Encontro'}
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4, fontFamily: type.body }}>
                {meeting.class?.name || 'Turma'} · {formatRelative(meeting.startsAt || meeting.date)}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
      <Pressable onPress={onOpenCalendar} testID="open-calendar">
        <Text style={{ color: colors.goldDark, fontFamily: type.bodyBold, marginTop: 4 }}>Ver a agenda</Text>
      </Pressable>
    </Screen>
  );
}
