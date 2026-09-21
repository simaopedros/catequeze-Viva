import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EncounterCard,
  ErrorState,
  LoadingState,
  MetricTile,
  Screen,
} from '../components/ui';
import { formatRelative, formatWhen } from '../format';
import { colors, spacing, type } from '../theme';

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
  const insets = useSafeAreaInsets();
  const today = stats?.todayMeetings ?? [];
  const focus = today[0];
  const upcoming = (meetings ?? stats?.upcomingMeetings ?? []).filter((item) => item.id !== focus?.id).slice(0, 5);
  const when = focus?.startsAt || focus?.date;

  return (
    <Screen
      testID="home-screen"
      refreshing={loading}
      onRefresh={onRefresh}
      contentStyle={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.md, paddingBottom: spacing.lg }}
    >
      <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 16, marginBottom: spacing.sm }} numberOfLines={1}>
        {name}
        {workspace ? <Text style={{ color: colors.muted, fontFamily: type.body }}>{` · ${workspace}`}</Text> : null}
      </Text>
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
        <Text style={{ color: colors.muted, fontFamily: type.body, marginBottom: spacing.sm }}>Sem encontro hoje</Text>
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
      <Text style={{ color: colors.ink, fontFamily: type.bodyBold, marginTop: 4, marginBottom: 6 }}>Próximos</Text>
      {upcoming.length === 0 && !loading ? (
        <Text style={{ color: colors.muted, fontFamily: type.body }}>Agenda livre</Text>
      ) : (
        upcoming.map((meeting) => (
          <Pressable
            key={meeting.id}
            onPress={() => onOpenMeeting(meeting.id)}
            testID={`meeting-${meeting.id}`}
            style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}
          >
            <Text style={{ color: colors.ink, fontFamily: type.bodyBold }} numberOfLines={1}>
              {meeting.title || meeting.theme || 'Encontro'}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 2, fontFamily: type.body }} numberOfLines={1}>
              {meeting.class?.name || 'Turma'} · {formatRelative(meeting.startsAt || meeting.date)}
            </Text>
          </Pressable>
        ))
      )}
      <Pressable onPress={onOpenCalendar} testID="open-calendar">
        <Text style={{ color: colors.goldDark, fontFamily: type.bodyBold, marginTop: 4 }}>Ver a agenda</Text>
      </Pressable>
    </Screen>
  );
}
