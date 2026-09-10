import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

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
      <ScreenTitle title={data?.name || 'Turma'} subtitle={data?.community?.name || data?.description || ''} />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Turma indisponível" body={error} /> : null}
      <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: 8 }}>Encontros</Text>
      {meetings.length === 0 && !loading ? (
        <EmptyState title="Sem encontros" body="Esta turma ainda não tem encontros listados." />
      ) : (
        meetings.map((meeting: any) => (
          <Pressable key={meeting.id} onPress={() => onOpenMeeting(meeting.id)}>
            <Card>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{meeting.title || meeting.theme || 'Encontro'}</Text>
              <Text style={{ color: colors.muted }}>{meeting.startsAt || meeting.date || ''}</Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
