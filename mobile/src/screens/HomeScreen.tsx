import React from 'react';
import {
  HomeAlertsCard,
  HomeClassesCarousel,
  HomeStatsRow,
  HomeTodayMeetingCard,
  HomeTopBar,
  formatMeetingTimeRange,
} from '../components/homeUi';
import { buildHomeAlertItems, type DashboardAlertSource } from '../home/homeAlerts';
import type { HomeAlertItem } from '../home/homeAlertNavigation';
import {
  meetingTimeRangeInput,
  pickAttendanceMeetingIdFromDashboard,
} from '../meetings/pickAttendanceMeeting';
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
  onOpenAttendanceOverview,
  onOpenSacraments,
  onOpenAlert,
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
    aniversariantes?: DashboardAlertSource['aniversariantes'];
    openRollCallIncomplete?: boolean;
    pendingAttendanceMeeting?: DashboardAlertSource['pendingAttendanceMeeting'];
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
  onOpenAttendanceOverview?: (meetingId?: string) => void;
  onOpenSacraments?: () => void;
  onOpenAlert?: (alert: HomeAlertItem) => void;
}) {
  const today = new Date();
  const todayMeeting = stats?.todayMeetings?.[0];
  const attendanceMeetingId = pickAttendanceMeetingIdFromDashboard(stats);
  const meetingTimes = meetingTimeRangeInput(todayMeeting);
  const alertItems = buildHomeAlertItems(stats, { attendanceMeetingId });
  const classes = (stats?.myClasses ?? []).slice(0, 8);

  const greetingName = firstName || name.split(/\s+/)[0] || name;
  const weekday = today.toLocaleDateString('pt-BR', { weekday: 'long' });
  const month = today.toLocaleDateString('pt-BR', { month: 'long' });

  const meetingClassLabel = todayMeeting?.class?.name || todayMeeting?.title || todayMeeting?.theme || 'Encontro';
  const meetingTheme =
    todayMeeting?.theme && todayMeeting.theme !== meetingClassLabel ? todayMeeting.theme : undefined;

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
            timeRange={formatMeetingTimeRange(meetingTimes.start, meetingTimes.end)}
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
            onPressAttendance={
              onOpenAttendanceOverview
                ? () => onOpenAttendanceOverview(attendanceMeetingId)
                : undefined
            }
            onPressSacraments={onOpenSacraments}
          />

          <HomeAlertsCard items={alertItems} onPressItem={onOpenAlert ? (item) => onOpenAlert(item) : undefined} />

          <HomeClassesCarousel classes={classes} onOpenClass={onOpenClass} onOpenAll={onOpenClasses} />
        </>
      ) : null}
    </Screen>
  );
}
