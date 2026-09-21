import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EncounterCard, ErrorState, LoadingState, MetricTile, Screen } from '../components/ui';
import { formatDay, formatRelative, formatWhen, personName } from '../format';
import { colors, radius, spacing, type } from '../theme';

type Meeting = {
  id: string;
  title?: string;
  theme?: string;
  startsAt?: string;
  date?: string;
  class?: { name?: string };
};

type ClassRow = { id: string; name?: string; enrollmentCount?: number };
type Birthday = { id: string; firstName?: string; lastName?: string; birthDate?: string };
type Alert = { type?: string; message?: string };

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
  onOpenClass,
  onOpenJourneys,
  onRefresh,
}: {
  name: string;
  workspace?: string;
  stats?: {
    activeClasses?: number;
    activeCatechumens?: number;
    avgAttendance?: number;
    pendingSacraments?: number;
    openRollCallIncomplete?: boolean;
    recentAlerts?: Alert[];
    aniversariantes?: Birthday[];
    myClasses?: ClassRow[];
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
  onOpenClass?: (id: string) => void;
  onOpenJourneys?: () => void;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const today = stats?.todayMeetings ?? [];
  const focus = today[0];
  const upcoming = (meetings ?? stats?.upcomingMeetings ?? []).filter((item) => item.id !== focus?.id).slice(0, 4);
  const when = focus?.startsAt || focus?.date;
  const alerts = (stats?.recentAlerts ?? []).filter((item) => item.message).slice(0, 2);
  const classes = (stats?.myClasses ?? []).slice(0, 4);
  const birthdays = (stats?.aniversariantes ?? []).slice(0, 4);

  return (
    <Screen
      testID="home-screen"
      refreshing={loading}
      onRefresh={onRefresh}
      contentStyle={{ paddingTop: insets.top + 10, paddingHorizontal: spacing.md, paddingBottom: spacing.lg }}
    >
      <Text style={{ color: colors.ink, fontFamily: type.display, fontSize: 30, lineHeight: 34 }} numberOfLines={1}>
        {name}
      </Text>
      {workspace ? (
        <Text style={{ color: colors.muted, fontFamily: type.body, marginTop: 2, marginBottom: spacing.sm }} numberOfLines={1}>
          {workspace}
        </Text>
      ) : (
        <View style={{ height: spacing.sm }} />
      )}
      {loading && !stats ? <LoadingState /> : null}
      {error ? <ErrorState title="Não foi possível carregar o início" body={error} /> : null}
      {focus ? (
        <EncounterCard
          testID={`meeting-${focus.id}`}
          title={focus.title || focus.theme || 'Encontro'}
          meta={[focus.class?.name || 'Turma', formatWhen(when)].filter(Boolean).join(' · ')}
          actionLabel={stats?.openRollCallIncomplete ? 'Chamada em aberto' : 'Fazer a chamada'}
          onAction={() => onOpenAttendance(focus.id)}
          onPress={() => onOpenMeeting(focus.id)}
        />
      ) : !loading ? (
        <Text style={{ color: colors.muted, fontFamily: type.body, marginBottom: spacing.md }}>Sem encontro hoje.</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.md }}>
        <MetricTile label="Turmas" value={stats?.activeClasses ?? '—'} onPress={onOpenClasses} testID="metric-classes" />
        <MetricTile
          label="Catequizandos"
          value={stats?.activeCatechumens ?? '—'}
          onPress={onOpenCatechumens}
          testID="metric-catechumens"
        />
        <MetricTile label="Presença" value={stats?.avgAttendance != null ? `${stats.avgAttendance}%` : '—'} />
        <MetricTile
          label="Sacramentos"
          value={stats?.pendingSacraments ?? '—'}
          onPress={onOpenJourneys}
          testID="metric-sacraments"
        />
      </View>
      {alerts.map((alert) => (
        <View
          key={alert.message}
          style={{
            backgroundColor: colors.cream,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.line,
            padding: spacing.sm,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: colors.inkSoft, fontFamily: type.body, lineHeight: 20 }}>{alert.message}</Text>
        </View>
      ))}
      {classes.length ? (
        <>
          <Text style={{ color: colors.ink, fontFamily: type.bodyBold, marginTop: 4, marginBottom: 6 }}>Turmas</Text>
          {classes.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => (onOpenClass ? onOpenClass(item.id) : onOpenClasses())}
              testID={`class-${item.id}`}
              style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}
            >
              <Text style={{ color: colors.ink, fontFamily: type.bodyBold }} numberOfLines={1}>
                {item.name || 'Turma'}
              </Text>
              <Text style={{ color: colors.muted, fontFamily: type.body, marginTop: 2 }}>
                {item.enrollmentCount ?? 0} catequizandos
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}
      {birthdays.length ? (
        <>
          <Text style={{ color: colors.ink, fontFamily: type.bodyBold, marginTop: 4, marginBottom: 6 }}>Aniversários</Text>
          {birthdays.map((person) => (
            <Text key={person.id} style={{ color: colors.inkSoft, fontFamily: type.body, marginBottom: 4 }}>
              {personName(person)} · {formatDay(person.birthDate)}
            </Text>
          ))}
        </>
      ) : null}
      <Text style={{ color: colors.ink, fontFamily: type.bodyBold, marginTop: spacing.sm, marginBottom: 6 }}>Próximos</Text>
      {upcoming.length === 0 && !loading ? (
        <Text style={{ color: colors.muted, fontFamily: type.body }}>Agenda livre esta semana.</Text>
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
            <Text style={{ color: colors.muted, fontFamily: type.body, marginTop: 2 }} numberOfLines={1}>
              {meeting.class?.name || 'Turma'} · {formatRelative(meeting.startsAt || meeting.date)}
            </Text>
          </Pressable>
        ))
      )}
      <Pressable onPress={onOpenCalendar} testID="open-calendar" style={{ paddingVertical: 8 }}>
        <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>Ver a agenda</Text>
      </Pressable>
    </Screen>
  );
}
