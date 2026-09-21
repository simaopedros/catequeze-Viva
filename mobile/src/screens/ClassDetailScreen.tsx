import React from 'react';
import { Pressable, Text } from 'react-native';
import { BrandButton, Card, EmptyState, ErrorState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { formatWhen } from '../format';
import { colors, type } from '../theme';

export function ClassDetailScreen({
  data,
  loading,
  error,
  onOpenMeeting,
  onOpenAttendance,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
  onOpenAttendance?: (id: string) => void;
}) {
  const meetings = data?.meetings || data?.upcomingMeetings || [];
  return (
    <Screen testID="class-detail-screen">
      <ScreenTitle title={data?.name || 'Turma'} subtitle={data?.community?.name || data?.description || ''} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Turma indisponível" body={error} /> : null}
      <Text style={{ color: colors.ink, fontFamily: type.bodyBold, marginBottom: 8 }}>Encontros</Text>
      {meetings.length === 0 && !loading ? (
        <EmptyState title="Sem encontros" body="Esta turma ainda não tem encontros listados." />
      ) : (
        meetings.map((meeting: any) => (
          <Pressable key={meeting.id} onPress={() => onOpenMeeting(meeting.id)}>
            <Card>
              <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>{meeting.title || meeting.theme || 'Encontro'}</Text>
              <Text style={{ color: colors.muted, fontFamily: type.body, marginTop: 4 }}>
                {formatWhen(meeting.startsAt || meeting.date)}
              </Text>
              {onOpenAttendance ? (
                <BrandButton variant="ghost" label="Fazer a chamada" onPress={() => onOpenAttendance(meeting.id)} />
              ) : null}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
