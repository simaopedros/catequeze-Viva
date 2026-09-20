import React from 'react';
import { View } from 'react-native';
import { copy } from '../copy/ptBR';
import { formatWhen } from '../format';
import {
  AppText,
  EmptyState,
  ErrorState,
  HeroBlock,
  LoadingState,
  PressableScale,
  Screen,
  SectionHeader,
  TextButton,
} from '../components/ui';
import { colors, radius, spacing } from '../theme';

type Meeting = {
  id: string;
  title?: string;
  theme?: string;
  startsAt?: string;
  class?: { name?: string };
};

export function HomeScreen({
  name,
  stats,
  meetings,
  loading,
  error,
  onOpenMeeting,
  onOpenCommunity,
  onOpenNotifications,
  onOpenClasses,
  onOpenAnnouncements,
  onOpenBirthdays,
  onOpenCalendar,
  unread,
  onRefresh,
  refreshing,
}: {
  name: string;
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
  onOpenCommunity: () => void;
  onOpenNotifications: () => void;
  onOpenClasses?: () => void;
  onOpenAnnouncements?: () => void;
  onOpenBirthdays?: () => void;
  onOpenCalendar?: () => void;
  unread?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const upcoming = meetings ?? stats?.upcomingMeetings ?? stats?.todayMeetings ?? [];
  const next = upcoming[0];
  const rest = upcoming.slice(1, 6);
  const attendance =
    typeof stats?.avgAttendance === 'number' ? `${Math.round(stats.avgAttendance)}%` : '—';

  return (
    <Screen testID="home-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <HeroBlock kicker={copy.home.kicker} title={copy.home.hello(name)} subtitle={copy.home.today}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <PressableScale onPress={onOpenClasses} style={{ flex: 1 }}>
            <AppText variant="caption" color="inkMuted">
              {copy.home.classes}
            </AppText>
            <AppText variant="title" color="inverse">
              {stats?.activeClasses ?? '—'}
            </AppText>
          </PressableScale>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color="inkMuted">
              {copy.home.catechumens}
            </AppText>
            <AppText variant="title" color="inverse">
              {stats?.activeCatechumens ?? '—'}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color="inkMuted">
              {copy.home.attendance}
            </AppText>
            <AppText variant="title" color="inverse">
              {attendance}
            </AppText>
          </View>
        </View>
      </HeroBlock>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.home.errorTitle} body={error} /> : null}
      <TextButton
        label={unread ? copy.home.notificationsUnread(unread) : copy.home.notifications}
        onPress={onOpenNotifications}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        {onOpenAnnouncements ? (
          <TextButton testID="home-announcements" label={copy.home.announcements} onPress={onOpenAnnouncements} />
        ) : null}
        {onOpenCalendar ? <TextButton testID="home-calendar" label={copy.home.calendar} onPress={onOpenCalendar} /> : null}
        {onOpenBirthdays ? (
          <TextButton testID="home-birthdays" label={copy.home.birthdays} onPress={onOpenBirthdays} />
        ) : null}
      </View>
      {next ? (
        <PressableScale testID={`meeting-${next.id}`} onPress={() => onOpenMeeting(next.id)}>
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: radius.lg,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.stroke,
              marginBottom: spacing.md,
            }}
          >
            <AppText variant="overline" color="goldMuted">
              {copy.home.nextMeeting}
            </AppText>
            <AppText variant="titleSm" style={{ marginTop: spacing.xxs }}>
              {next.title || next.theme || copy.home.meetingFallback}
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 4 }}>
              {next.class?.name || copy.home.classFallback}
              {next.startsAt ? ` · ${formatWhen(next.startsAt)}` : ''}
            </AppText>
          </View>
        </PressableScale>
      ) : null}
      <SectionHeader title={copy.home.upcoming} />
      {upcoming.length === 0 && !loading ? (
        <EmptyState title={copy.home.emptyTitle} body={copy.home.emptyBody} />
      ) : (
        rest.map((meeting) => (
          <PressableScale key={meeting.id} testID={`meeting-${meeting.id}`} onPress={() => onOpenMeeting(meeting.id)}>
            <View style={{ paddingVertical: spacing.sm }}>
              <AppText variant="body" weight="semibold">
                {meeting.title || meeting.theme || copy.home.meetingFallback}
              </AppText>
              <AppText variant="caption" color="secondary">
                {meeting.class?.name || copy.home.classFallback}
                {meeting.startsAt ? ` · ${formatWhen(meeting.startsAt)}` : ''}
              </AppText>
            </View>
          </PressableScale>
        ))
      )}
      <TextButton label={copy.home.goCommunity} onPress={onOpenCommunity} />
    </Screen>
  );
}
