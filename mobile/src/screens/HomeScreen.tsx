import React from 'react';
import {
  HomeAlertsCard,
  HomeClassesCarousel,
  HomeStatsRow,
  HomeTodayMeetingCard,
  HomeTopBar,
  formatMeetingTimeRange,
} from '../components/homeUi';
import { ErrorState, LoadingState, Screen } from '../components/ui';

type Meeting = {
  id: string;
  title?: string;
  theme?: string;
  startsAt?: string;
  endsAt?: string;
  class?: { name?: string };
};

export function HomeScreen({
  name,
  firstName,
  avatarUrl,
  workspaceName,
  stats,
  loading,
  error,
  onRefresh,
  refreshing,
  onOpenMeeting,
  onOpenAttendance,
  onOpenClass,
  onOpenCatechumens,
  onOpenClasses,
}: {
  name: string;
  firstName?: string;
  avatarUrl?: string | null;
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
  onOpenCatechumens?: () => void;
  onOpenClasses?: () => void;
}) {
  const today = new Date();
  const todayMeeting = stats?.todayMeetings?.[0];
  const alerts = (stats?.recentAlerts ?? []).slice(0, 3);
  const birthdays = (stats?.aniversariantes ?? []).slice(0, 2);
  const classes = (stats?.myClasses ?? []).slice(0, 8);

  const greetingName = firstName || name.split(/\s+/)[0] || name;
  const weekday = today.toLocaleDateString('pt-BR', { weekday: 'long' });
  const month = today.toLocaleDateString('pt-BR', { month: 'long' });

  const meetingClassLabel = todayMeeting?.class?.name || todayMeeting?.title || todayMeeting?.theme || 'Encontro';
  const meetingTheme =
    todayMeeting?.theme && todayMeeting.theme !== meetingClassLabel ? todayMeeting.theme : undefined;

  const alertItems = [
    ...alerts.map((a) => ({ type: a.type, message: a.message })),
    ...birthdays.map((b) => ({
      type: 'birthday',
      message: `Aniversário: ${b.name || 'Catequizando'}`,
      meta: b.day != null ? `dia ${b.day}` : undefined,
    })),
  ].slice(0, 4);

  return (
    <Screen testID="home-screen" onRefresh={onRefresh} refreshing={refreshing} safeAreaEdges={['top', 'left', 'right']}>
      <HomeTopBar
        day={today.getDate()}
        weekday={weekday}
        month={month}
        firstName={greetingName}
        workspaceName={workspaceName}
        avatarUrl={avatarUrl}
        avatarName={name}
      />

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Não foi possível carregar o início" onRetry={onRefresh} /> : null}

      {!loading && !error ? (
        <>
          <HomeTodayMeetingCard
            empty={!todayMeeting}
            classLabel={meetingClassLabel}
            timeRange={formatMeetingTimeRange(todayMeeting?.startsAt, todayMeeting?.endsAt)}
            theme={meetingTheme}
            onAttendance={todayMeeting ? () => onOpenAttendance(todayMeeting.id) : undefined}
            onPress={todayMeeting ? () => onOpenMeeting(todayMeeting.id) : undefined}
          />

          <HomeStatsRow
            values={{
              classes: stats?.activeClasses ?? '—',
              catechumens: stats?.activeCatechumens ?? '—',
              attendance: stats?.avgAttendance != null ? `${stats.avgAttendance}%` : '—',
              sacraments: stats?.pendingSacraments ?? '—',
            }}
            onPressClasses={onOpenClasses}
            onPressCatechumens={onOpenCatechumens}
          />

          <HomeAlertsCard items={alertItems} />

          <HomeClassesCarousel classes={classes} onOpenClass={onOpenClass} onOpenAll={onOpenClasses} />
        </>
      ) : null}
    </Screen>
  );
}
