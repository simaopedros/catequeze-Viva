import React from 'react';
import { EmptyState, ErrorState, ListRow, LoadingState, Screen, ScreenTitle, SectionHeader } from '../components/ui';
import { copy } from '../copy/ptBR';

export function ClassDetailScreen({
  data,
  loading,
  error,
  onOpenMeeting,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
}) {
  const meetings = data?.meetings || data?.upcomingMeetings || [];
  return (
    <Screen testID="class-detail-screen">
      <ScreenTitle title={data?.name || copy.classes.fallback} subtitle={data?.community?.name || data?.description || ''} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.classes.classError} body={error} /> : null}
      <SectionHeader title={copy.classes.meetings} />
      {meetings.length === 0 && !loading ? (
        <EmptyState title={copy.classes.emptyMeetingsTitle} body={copy.classes.emptyMeetingsBody} />
      ) : (
        meetings.map((meeting: any) => (
          <ListRow
            key={meeting.id}
            title={meeting.title || meeting.theme || copy.meeting.fallback}
            meta={meeting.startsAt || meeting.date || ''}
            onPress={() => onOpenMeeting(meeting.id)}
          />
        ))
      )}
    </Screen>
  );
}
