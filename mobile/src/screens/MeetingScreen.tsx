import React from 'react';
import { AppText, BrandButton, EmptyState, ErrorState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';

export function MeetingScreen({
  data,
  loading,
  error,
  onAttendance,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onAttendance: () => void;
}) {
  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <ErrorState title={copy.meeting.errorTitle} body={error || copy.meeting.notFound} />
      </Screen>
    );
  }

  return (
    <Screen testID="meeting-screen">
      <ScreenTitle title={data.title || data.theme || copy.meeting.fallback} subtitle={data.class?.name || ''} />
      <AppText variant="bodySm" color="secondary" style={{ marginBottom: 16 }}>
        {data.startsAt || data.date || ''}
      </AppText>
      {data.notes ? (
        <AppText variant="body" color="inkSoft" style={{ marginBottom: 16 }}>
          {data.notes}
        </AppText>
      ) : null}
      <BrandButton label={copy.meeting.markAttendance} onPress={onAttendance} testID="open-attendance" />
    </Screen>
  );
}
