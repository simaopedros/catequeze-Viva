import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { BrandButton, Card, EmptyState, ListCard, ListRow, Row, Screen, ScreenTitle, SkeletonList, StatCard } from '../components/ui';
import { colors, spacing } from '../theme';
import { formatDateTime } from '../utils/format';
import { ATTENDANCE_META, type AttendanceStatus } from './AttendanceScreen';

type MatrixMeeting = {
  id: string;
  title?: string | null;
  theme?: string | null;
  date?: string;
  status?: string;
  attendance?: { status: string; catechumenProfileId: string }[];
};

function countBy(records: { status: string }[] | undefined) {
  const result: Record<AttendanceStatus, number> = { PRESENT: 0, LATE: 0, ABSENT: 0, JUSTIFIED: 0 };
  for (const record of records ?? []) {
    if (record.status in result) result[record.status as AttendanceStatus] += 1;
  }
  return result;
}

export function ClassAttendanceMatrixScreen({
  className,
  meetings,
  enrolledCount,
  loading,
  error,
  onOpenMeeting,
  onCreateMeeting,
  refreshing,
  onRefresh,
}: {
  className?: string | null;
  meetings: MatrixMeeting[];
  enrolledCount?: number;
  loading?: boolean;
  error?: string | null;
  onOpenMeeting: (meetingId: string) => void;
  onCreateMeeting?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const sorted = useMemo(() => [...meetings].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()), [meetings]);
  const totals = useMemo(() => {
    const all = sorted.flatMap((meeting) => meeting.attendance ?? []);
    const counts = countBy(all);
    const marked = all.length;
    const rate = marked ? Math.round(((counts.PRESENT + counts.LATE) / marked) * 100) : null;
    return { counts, marked, rate };
  }, [sorted]);

  return (
    <Screen testID="class-attendance-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle eyebrow={className ?? 'Turma'} title="Presenças" subtitle="Toque num encontro para marcar ou rever a presença." />
      {loading && meetings.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Presenças indisponíveis" body={error} /> : null}
      {!loading && !error ? (
        <>
          <Row style={{ alignItems: 'stretch' }}>
            <StatCard label="Encontros" value={sorted.length} icon="calendar-outline" />
            <StatCard label="Taxa de presença" value={totals.rate != null ? `${totals.rate}%` : '—'} icon="chart-arc" hint={totals.marked ? `${totals.marked} registos` : undefined} />
          </Row>
          {onCreateMeeting ? <BrandButton variant="gold" icon="calendar-plus" label="Novo encontro" onPress={onCreateMeeting} testID="create-meeting" /> : null}
          {sorted.length === 0 ? (
            <EmptyState icon="calendar-blank-outline" title="Sem encontros" body="Crie o primeiro encontro para começar a registar presenças." />
          ) : (
            <ListCard style={{ marginTop: spacing.sm }}>
              {sorted.map((meeting, index) => {
                const counts = countBy(meeting.attendance);
                const marked = (meeting.attendance ?? []).length;
                const pending = enrolledCount != null ? Math.max(enrolledCount - marked, 0) : null;
                return (
                  <ListRow
                    key={meeting.id}
                    testID={`matrix-meeting-${meeting.id}`}
                    icon={marked > 0 ? 'clipboard-check-outline' : 'clipboard-text-outline'}
                    title={meeting.title || meeting.theme || 'Encontro'}
                    subtitle={formatDateTime(meeting.date)}
                    right={
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Row gap={6}>
                          {(Object.keys(ATTENDANCE_META) as AttendanceStatus[]).map((status) =>
                            counts[status] > 0 ? (
                              <Text key={status} variant="labelSmall" style={{ color: ATTENDANCE_META[status].color, fontWeight: '700' }}>
                                {ATTENDANCE_META[status].short}
                                {counts[status]}
                              </Text>
                            ) : null,
                          )}
                        </Row>
                        {pending ? (
                          <Text variant="labelSmall" style={{ color: colors.warning }}>
                            {pending} por marcar
                          </Text>
                        ) : marked === 0 ? (
                          <Text variant="labelSmall" style={{ color: colors.muted }}>
                            Sem registos
                          </Text>
                        ) : null}
                      </View>
                    }
                    onPress={() => onOpenMeeting(meeting.id)}
                    last={index === sorted.length - 1}
                  />
                );
              })}
            </ListCard>
          )}
          <Card tone="paper">
            <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
              {(Object.keys(ATTENDANCE_META) as AttendanceStatus[]).map((status) => (
                <Row key={status} gap={4}>
                  <Text variant="labelSmall" style={{ color: ATTENDANCE_META[status].color, fontWeight: '700' }}>
                    {ATTENDANCE_META[status].short}
                  </Text>
                  <Text variant="labelSmall" style={{ color: colors.muted }}>
                    {ATTENDANCE_META[status].label}
                  </Text>
                </Row>
              ))}
            </Row>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
