import React from 'react';
import { Pressable, Text } from 'react-native';
import { ClassHero } from '../components/pastoralUi';
import { Card, EmptyState, LoadingState, Screen, SectionHeader } from '../components/ui';
import { colors, spacing } from '../theme';

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
  const enrollment = data?.enrollmentCount ?? data?.catechumenCount;

  return (
    <Screen testID="class-detail-screen">
      <ClassHero
        name={data?.name || 'Turma'}
        community={data?.community?.name || data?.description}
        stats={
          enrollment != null
            ? [
                { label: 'Catequizandos', value: String(enrollment) },
                { label: 'Encontros', value: String(meetings.length) },
              ]
            : [{ label: 'Encontros', value: String(meetings.length) }]
        }
      />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Turma indisponível" body={error} /> : null}
      <SectionHeader title="Próximos encontros" />
      {meetings.length === 0 && !loading ? (
        <EmptyState title="Sem encontros" body="Esta turma ainda não tem encontros listados." />
      ) : (
        meetings.map((meeting: any) => (
          <Pressable key={meeting.id} onPress={() => onOpenMeeting(meeting.id)}>
            <Card elevated>
              <Text style={{ color: colors.primary[800], fontWeight: '600', fontSize: 13 }}>
                {meeting.startsAt || meeting.date || 'Data a definir'}
              </Text>
              <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 17, marginTop: spacing[1] }}>
                {meeting.title || meeting.theme || 'Encontro'}
              </Text>
              <Text style={{ color: colors.primary[700], fontWeight: '600', marginTop: spacing[3] }}>Ver encontro ›</Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
