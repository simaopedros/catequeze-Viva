import React from 'react';
import { View } from 'react-native';
import { copy } from '../copy/ptBR';
import {
  BrandButton,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  ScreenTitle,
  SectionHeader,
  StatCard,
} from '../components/ui';
import { spacing } from '../theme';

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
  unread?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const upcoming = meetings ?? stats?.upcomingMeetings ?? stats?.todayMeetings ?? [];

  return (
    <Screen testID="home-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={copy.home.hello(name)} subtitle={copy.home.subtitle} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.home.errorTitle} body={error} /> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs }}>
        <StatCard label={copy.home.classes} value={stats?.activeClasses ?? '—'} />
        <StatCard label={copy.home.catechumens} value={stats?.activeCatechumens ?? '—'} />
      </View>
      <ListRow
        title={unread ? copy.home.notificationsUnread(unread) : copy.home.notifications}
        onPress={onOpenNotifications}
      />
      <BrandButton variant="soft" label={copy.home.goCommunity} onPress={onOpenCommunity} />
      <SectionHeader title={copy.home.upcoming} />
      {upcoming.length === 0 && !loading ? (
        <EmptyState title={copy.home.emptyTitle} body={copy.home.emptyBody} />
      ) : (
        upcoming.slice(0, 5).map((meeting) => (
          <ListRow
            key={meeting.id}
            testID={`meeting-${meeting.id}`}
            title={meeting.title || meeting.theme || copy.home.meetingFallback}
            meta={`${meeting.class?.name || copy.home.classFallback}${meeting.startsAt ? ` · ${meeting.startsAt}` : ''}`}
            onPress={() => onOpenMeeting(meeting.id)}
          />
        ))
      )}
    </Screen>
  );
}
