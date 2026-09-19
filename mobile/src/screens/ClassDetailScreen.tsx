import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors, spacing } from '../theme';

function attendanceRateLabel(summary: any): string | null {
  const rate = summary?.attendanceRate;
  // O backend devolve a taxa já em percentagem (0-100).
  if (typeof rate === 'number') return `${Math.round(rate)}% de presença`;
  if (typeof rate === 'string') return rate;
  return null;
}

const CATECHIST_ROLE_LABELS: Record<string, string> = {
  LEAD: 'Principal',
  ASSISTANT: 'Auxiliar',
};

function catechistRoleLabel(role: unknown): string {
  if (typeof role !== 'string' || !role) return '';
  return CATECHIST_ROLE_LABELS[role] ?? role;
}

export function ClassDetailScreen({
  data,
  loading,
  error,
  onOpenMeeting,
  onOpenCatechumen,
  refreshing,
  onRefresh,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (id: string) => void;
  onOpenCatechumen?: (id: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const meetings = data?.meetings || data?.upcomingMeetings || [];
  const enrollments = Array.isArray(data?.enrollments) ? data.enrollments : [];
  const catechists = Array.isArray(data?.catechists) ? data.catechists : [];
  const summary = data?.attendanceSummary;
  const rateLabel = attendanceRateLabel(summary);

  return (
    <Screen testID="class-detail-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle title={data?.name || 'Turma'} subtitle={data?.community?.name || data?.description || ''} />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Turma indisponível" body={error} /> : null}

      {summary ? (
        <Card>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>Resumo de presença</Text>
          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
            <View>
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18 }}>
                {summary.totalMeetings ?? data?._count?.meetings ?? 0}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Encontros</Text>
            </View>
            <View>
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18 }}>{summary.presentCount ?? 0}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Presenças</Text>
            </View>
            <View>
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18 }}>{summary.absentCount ?? 0}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Faltas</Text>
            </View>
          </View>
          {rateLabel ? <Text style={{ color: colors.goldDark, marginTop: spacing.sm }}>{rateLabel}</Text> : null}
        </Card>
      ) : null}

      {catechists.length > 0 ? (
        <>
          <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: spacing.sm }}>Catequistas</Text>
          <Card>
            {catechists.map((entry: any) => {
              const user = entry.user || {};
              const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Catequista';
              const role = catechistRoleLabel(entry.role);
              return (
                <Text key={entry.id || user.id || name} style={{ color: colors.inkSoft, marginBottom: 4 }}>
                  {name}
                  {role ? ` · ${role}` : ''}
                </Text>
              );
            })}
          </Card>
        </>
      ) : null}

      <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: spacing.sm }}>
        Catequizandos{data?._count?.enrollments != null ? ` (${data._count.enrollments})` : ''}
      </Text>
      {enrollments.length === 0 && !loading ? (
        <EmptyState title="Sem catequizandos" body="Esta turma ainda não tem inscrições ativas." />
      ) : (
        enrollments.map((enrollment: any) => {
          const profile = enrollment.catechumenProfile || {};
          const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Catequizando';
          return (
            <Pressable
              key={enrollment.id}
              onPress={() => profile.id && onOpenCatechumen?.(profile.id)}
              disabled={!onOpenCatechumen}
              testID={`catechumen-${profile.id || enrollment.id}`}
            >
              <Card>
                <Text style={{ color: colors.ink, fontWeight: '700' }}>{name}</Text>
              </Card>
            </Pressable>
          );
        })
      )}

      <Text style={{ color: colors.ink, fontWeight: '700', marginVertical: spacing.sm }}>Encontros</Text>
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
