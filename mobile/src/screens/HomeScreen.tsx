import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EncounterCard, ErrorState, LoadingState, MetricTile, Screen } from '../components/ui';
import { formatWhen, personName } from '../format';
import { colors, spacing, type } from '../theme';

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

function clock(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function dayMark(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return String(date.getDate()).padStart(2, '0');
}

function Index({ children }: { children: string }) {
  return (
    <Text
      style={{
        marginTop: 28,
        marginBottom: 4,
        color: colors.ink,
        fontFamily: type.bodyBold,
        fontSize: 11,
        letterSpacing: 1.8,
      }}
    >
      {children.toUpperCase()}
    </Text>
  );
}

function Slot({
  mark,
  title,
  detail,
  onPress,
  testID,
}: {
  mark: string;
  title: string;
  detail?: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={{ flexDirection: 'row', alignItems: 'baseline', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}
    >
      <Text style={{ width: 56, color: colors.ink, fontFamily: type.bodyBold, fontSize: 13 }}>{mark}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink, fontFamily: type.body, fontSize: 16 }} numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text style={{ color: colors.muted, fontFamily: type.body, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

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
  const now = new Date();
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(now);
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(now);
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
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 72, lineHeight: 72, letterSpacing: -3 }}>{day}</Text>
        <View style={{ alignItems: 'flex-end', paddingBottom: 8 }}>
          <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 12, letterSpacing: 1.6 }}>
            {weekday.toUpperCase()}
          </Text>
          <Text style={{ color: colors.muted, fontFamily: type.bodyMedium, fontSize: 12, letterSpacing: 1.6, marginTop: 2 }}>
            {month.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={{ color: colors.ink, fontFamily: type.bodyBold, fontSize: 15, marginTop: 12 }} numberOfLines={1}>
        {name}
      </Text>
      {workspace ? (
        <Text style={{ color: colors.muted, fontFamily: type.body, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
          {workspace}
        </Text>
      ) : null}
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
      <Index>Hoje</Index>
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
      {alerts.map((alert) => (
        <View key={alert.message} style={{ borderLeftWidth: 4, borderLeftColor: colors.gold, paddingLeft: 12, paddingVertical: 10 }}>
          <Text style={{ color: colors.ink, fontFamily: type.body, lineHeight: 20 }}>{alert.message}</Text>
        </View>
      ))}
      {classes.length ? (
        <>
          <Index>Turmas</Index>
          {classes.map((item) => (
            <Slot
              key={item.id}
              testID={`class-${item.id}`}
              mark={String(item.enrollmentCount ?? 0).padStart(2, '0')}
              title={item.name || 'Turma'}
              detail="catequizandos"
              onPress={() => (onOpenClass ? onOpenClass(item.id) : onOpenClasses())}
            />
          ))}
        </>
      ) : null}
      {birthdays.length ? (
        <>
          <Index>Aniversários</Index>
          {birthdays.map((person) => (
            <Slot key={person.id} mark={dayMark(person.birthDate)} title={personName(person)} />
          ))}
        </>
      ) : null}
      <Index>Próximos</Index>
      {upcoming.length === 0 && !loading ? (
        <Text style={{ color: colors.muted, fontFamily: type.body }}>Agenda livre esta semana.</Text>
      ) : (
        upcoming.map((meeting) => (
          <Slot
            key={meeting.id}
            testID={`meeting-${meeting.id}`}
            mark={clock(meeting.startsAt || meeting.date)}
            title={meeting.title || meeting.theme || 'Encontro'}
            detail={meeting.class?.name || 'Turma'}
            onPress={() => onOpenMeeting(meeting.id)}
          />
        ))
      )}
      <Pressable onPress={onOpenCalendar} testID="open-calendar" style={{ paddingVertical: 16 }}>
        <Text style={{ color: colors.ink, fontFamily: type.bodyBold, letterSpacing: 1.2 }}>AGENDA</Text>
      </Pressable>
    </Screen>
  );
}
