import React from 'react';
import { Text, View } from 'react-native';
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  MeetingHighlightCard,
  Screen,
  SectionHeader,
  StatCard,
} from '../components/ui';
import { colors, spacing } from '../theme';

type Meeting = {
  id: string;
  title?: string;
  theme?: string;
  startsAt?: string;
  class?: { name?: string };
};

export function HomeScreen({
  name,
  workspaceName,
  stats,
  loading,
  error,
  onRefresh,
  refreshing,
  onOpenMeeting,
  onOpenAttendance,
  onOpenClass,
  onOpenCalendar,
  onOpenCatechumens,
  onOpenClasses,
}: {
  name: string;
  workspaceName?: string;
  stats?: {
    activeClasses?: number;
    activeCatechumens?: number;
    avgAttendance?: number;
    pendingSacraments?: number;
    recentAlerts?: { type?: string; message?: string }[];
    aniversariantes?: { id?: string; name?: string; day?: number }[];
    myClasses?: { id: string; name: string; enrollmentCount?: number }[];
    upcomingMeetings?: Meeting[];
    todayMeetings?: Meeting[];
  } | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  onOpenMeeting: (id: string) => void;
  onOpenAttendance: (id: string) => void;
  onOpenClass?: (id: string) => void;
  onOpenCalendar?: () => void;
  onOpenCatechumens?: () => void;
  onOpenClasses?: () => void;
}) {
  const today = new Date();
  const todayMeeting = stats?.todayMeetings?.[0];
  const upcoming = stats?.upcomingMeetings ?? [];
  const alerts = (stats?.recentAlerts ?? []).slice(0, 2);
  const classes = (stats?.myClasses ?? []).slice(0, 4);
  const birthdays = (stats?.aniversariantes ?? []).slice(0, 4);

  return (
    <Screen testID="home-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text.primary }}>{today.getDate()}</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.muted, textTransform: 'uppercase' }}>
          {today.toLocaleDateString('pt-BR', { weekday: 'long' })}
        </Text>
        <Text style={{ fontSize: 15, color: colors.text.muted }}>
          {today.toLocaleDateString('pt-BR', { month: 'long' })}
        </Text>
      </View>

      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>{name}</Text>
      {workspaceName ? <Text style={{ fontSize: 13, color: colors.text.muted, marginBottom: spacing[4] }}>{workspaceName}</Text> : null}

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Não foi possível carregar o início" onRetry={onRefresh} /> : null}

      {!loading && !error ? (
        <>
          <MeetingHighlightCard
            empty={!todayMeeting}
            className={todayMeeting?.class?.name}
            title={todayMeeting?.title || todayMeeting?.theme || 'Encontro'}
            timeLabel={todayMeeting?.startsAt}
            onAttendance={todayMeeting ? () => onOpenAttendance(todayMeeting.id) : undefined}
            onPress={todayMeeting ? () => onOpenMeeting(todayMeeting.id) : undefined}
          />

          <SectionHeader title="Hoje" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
            <View style={{ width: '47%' }}>
              <StatCard label="Turmas" value={stats?.activeClasses ?? '—'} onPress={onOpenClasses} />
            </View>
            <View style={{ width: '47%' }}>
              <StatCard label="Catequizandos" value={stats?.activeCatechumens ?? '—'} onPress={onOpenCatechumens} />
            </View>
            <View style={{ width: '47%' }}>
              <StatCard label="Presença" value={stats?.avgAttendance != null ? `${stats.avgAttendance}%` : '—'} disabled />
            </View>
            <View style={{ width: '47%' }}>
              <StatCard label="Sacramentos" value={stats?.pendingSacraments ?? '—'} />
            </View>
          </View>

          {alerts.length > 0 ? (
            <>
              <SectionHeader title="Alertas" />
              {alerts.map((alert, index) => (
                <ListRow
                  key={`alert-${index}`}
                  title={alert.type || 'Alerta'}
                  subtitle={alert.message}
                />
              ))}
            </>
          ) : null}

          <SectionHeader title="Turmas" />
          {classes.length === 0 ? (
            <EmptyState title="Sem turmas" />
          ) : (
            classes.map((klass) => (
              <ListRow
                key={klass.id}
                title={klass.name}
                subtitle={`${klass.enrollmentCount ?? 0} catequizandos`}
                onPress={onOpenClass ? () => onOpenClass(klass.id) : undefined}
              />
            ))
          )}

          <SectionHeader title="Aniversariantes" />
          {birthdays.length === 0 ? (
            <Text style={{ color: colors.text.muted, marginBottom: spacing[4] }}>Ninguém esta semana.</Text>
          ) : (
            birthdays.map((person, index) => (
              <ListRow key={person.id ?? `b-${index}`} title={person.name || 'Aniversariante'} subtitle={`dia ${person.day}`} avatarName={person.name} />
            ))
          )}

          <SectionHeader title="Próximos encontros" actionLabel="Agenda" onAction={onOpenCalendar} />
          {upcoming.length === 0 ? (
            <EmptyState title="Agenda livre esta semana." />
          ) : (
            upcoming.slice(0, 4).map((meeting) => (
              <ListRow
                key={meeting.id}
                title={meeting.title || meeting.theme || 'Encontro'}
                subtitle={`${meeting.startsAt || ''} · ${meeting.class?.name || 'Turma'}`}
                onPress={() => onOpenMeeting(meeting.id)}
              />
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}
