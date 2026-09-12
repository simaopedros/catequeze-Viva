import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { asItems, formatDate, personName, statusLabel } from '../lib/payload';
import { colors, spacing } from '../theme';

export function ClassDetailScreen({
  data,
  loading,
  error,
  onOpenMeeting,
  onOpenCatechumen,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
  onOpenCatechumen?: (id: string) => void;
}) {
  const meetings = asItems(data?.meetings).length
    ? asItems(data?.meetings)
    : asItems(data?.upcomingMeetings);
  const enrollments = asItems(data?.enrollments, ['enrollments']);
  const summary = data?.attendanceSummary;

  return (
    <Screen testID="class-detail-screen">
      <ScreenTitle
        title={data?.name || 'Turma'}
        subtitle={[data?.community?.name, data?.stage?.name, data?.sacrament?.name]
          .filter(Boolean)
          .join(' · ')}
      />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Turma indisponível" body={error} /> : null}
      {summary ? (
        <Card>
          <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: 6 }}>Presença</Text>
          <Text style={{ color: colors.muted }}>
            {summary.attendanceRate != null
              ? `${Math.round(Number(summary.attendanceRate))}% de presença`
              : 'Sem taxa ainda'}
            {summary.totalMeetings ? ` · ${summary.totalMeetings} encontros` : ''}
          </Text>
        </Card>
      ) : null}
      <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: 8 }}>Catequizandos</Text>
      {enrollments.length === 0 && !loading ? (
        <EmptyState title="Sem inscritos" body="Esta turma ainda não tem catequizandos inscritos." />
      ) : (
        enrollments.map((row: any) => {
          const profile = row.catechumenProfile || row;
          const id = profile.id || row.catechumenProfileId;
          return (
            <Pressable
              key={row.id || id}
              onPress={() => id && onOpenCatechumen?.(id)}
              disabled={!onOpenCatechumen || !id}
            >
              <Card>
                <Text style={{ color: colors.ink, fontWeight: '700' }}>{personName(profile)}</Text>
                <Text style={{ color: colors.muted }}>{statusLabel(row.status)}</Text>
              </Card>
            </Pressable>
          );
        })
      )}
      <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: 8, marginTop: spacing.sm }}>
        Encontros
      </Text>
      {meetings.length === 0 && !loading ? (
        <EmptyState title="Sem encontros" body="Esta turma ainda não tem encontros listados." />
      ) : (
        meetings.map((meeting: any) => (
          <Pressable key={meeting.id} onPress={() => onOpenMeeting(meeting.id)}>
            <Card>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>
                {meeting.title || meeting.theme || 'Encontro'}
              </Text>
              <Text style={{ color: colors.muted }}>
                {formatDate(meeting.startsAt || meeting.date)} {meeting.status ? `· ${statusLabel(meeting.status)}` : ''}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
