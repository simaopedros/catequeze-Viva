import { BookOpen, Church, GraduationCap, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { AlertStrip, StatTile } from '../components/pastoralUi';
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  MeetingHighlightCard,
  Screen,
  SectionHeader,
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
  const alerts = (stats?.recentAlerts ?? []).slice(0, 4);
  const classes = (stats?.myClasses ?? []).slice(0, 4);
  const birthdays = (stats?.aniversariantes ?? []).slice(0, 4);

  const weekday = today.toLocaleDateString('pt-BR', { weekday: 'long' });
  const month = today.toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <Screen testID="home-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.dateHeader}>
        <View>
          <Text style={styles.dateDay}>{today.getDate()}</Text>
          <Text style={styles.dateWeekday}>{weekday}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>
        <View style={styles.greeting}>
          <Text style={styles.greetingName}>{name}</Text>
          {workspaceName ? <Text style={styles.greetingWorkspace}>{workspaceName}</Text> : null}
        </View>
      </View>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Não foi possível carregar o início" onRetry={onRefresh} /> : null}

      {!loading && !error ? (
        <>
          <AlertStrip items={alerts} />

          <MeetingHighlightCard
            empty={!todayMeeting}
            className={todayMeeting?.class?.name}
            title={todayMeeting?.title || todayMeeting?.theme || 'Encontro'}
            timeLabel={todayMeeting?.startsAt}
            onAttendance={todayMeeting ? () => onOpenAttendance(todayMeeting.id) : undefined}
            onPress={todayMeeting ? () => onOpenMeeting(todayMeeting.id) : undefined}
          />

          <SectionHeader title="Hoje" />
          <View style={styles.statGrid}>
            <View style={styles.statCell}>
              <StatTile label="Turmas" value={stats?.activeClasses ?? '—'} icon={GraduationCap} onPress={onOpenClasses} />
            </View>
            <View style={styles.statCell}>
              <StatTile
                label="Catequizandos"
                value={stats?.activeCatechumens ?? '—'}
                icon={BookOpen}
                onPress={onOpenCatechumens}
              />
            </View>
            <View style={styles.statCell}>
              <StatTile
                label="Presença"
                value={stats?.avgAttendance != null ? `${stats.avgAttendance}%` : '—'}
                icon={Church}
                disabled
              />
            </View>
            <View style={styles.statCell}>
              <StatTile label="Sacramentos" value={stats?.pendingSacraments ?? '—'} icon={Sparkles} />
            </View>
          </View>

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
              <ListRow
                key={person.id ?? `b-${index}`}
                title={person.name || 'Aniversariante'}
                subtitle={`dia ${person.day}`}
                avatarName={person.name}
              />
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

const styles = {
  dateHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: spacing[4],
    gap: spacing[4],
  },
  dateDay: { fontSize: 40, fontWeight: '700' as const, color: colors.text.primary, lineHeight: 44 },
  dateWeekday: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text.muted,
    textTransform: 'capitalize' as const,
  },
  dateMonth: { fontSize: 15, color: colors.text.muted, textTransform: 'capitalize' as const },
  greeting: { flex: 1, alignItems: 'flex-end' as const, paddingTop: 4 },
  greetingName: { fontSize: 17, fontWeight: '700' as const, color: colors.text.primary, textAlign: 'right' as const },
  greetingWorkspace: { fontSize: 13, color: colors.text.muted, marginTop: 4, textAlign: 'right' as const },
  statGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing[3], marginBottom: spacing[2] },
  statCell: { width: '47%' as const },
};
