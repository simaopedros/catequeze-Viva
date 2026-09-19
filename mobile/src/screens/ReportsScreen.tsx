import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { BrandButton, Card, EmptyState, ListCard, ListRow, Row, Screen, ScreenTitle, SectionHeader, SkeletonList, StatCard, Tag } from '../components/ui';
import { colors, spacing } from '../theme';
import { formatDate } from '../utils/format';

export type ClassReportRow = {
  id: string;
  name: string;
  lastMeetingDate?: string | null;
  totalEnrolled: number;
  totalMeetings: number;
  totalAttendanceRecords?: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
};

function RateBar({ value }: { value: number }) {
  const tone = value >= 75 ? colors.success : value >= 50 ? colors.warning : colors.danger;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.paper, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', backgroundColor: tone }} />
    </View>
  );
}

export function ReportsScreen({
  data,
  loading,
  error,
  onOpenClass,
  onExportCsv,
  exporting,
  refreshing,
  onRefresh,
}: {
  data: { totalEnrolled?: number; totalMeetings?: number; avgAttendance?: number; classReports?: ClassReportRow[] } | null;
  loading?: boolean;
  error?: string | null;
  onOpenClass: (id: string) => void;
  onExportCsv?: () => void;
  exporting?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const ranking = useMemo(() => [...(data?.classReports ?? [])].sort((a, b) => b.attendanceRate - a.attendanceRate), [data?.classReports]);
  const withMeetings = ranking.filter((row) => row.totalMeetings > 0);
  const best = withMeetings[0];
  const worst = withMeetings.length > 1 ? withMeetings[withMeetings.length - 1] : null;

  return (
    <Screen testID="reports-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle compact subtitle="Presença e atividade das turmas da paróquia." />
      {loading && !data ? <SkeletonList rows={3} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Relatórios indisponíveis" body={error} /> : null}
      {data ? (
        <>
          <Row style={{ alignItems: 'stretch' }}>
            <StatCard label="Inscritos" value={data.totalEnrolled ?? 0} icon="account-child-outline" />
            <StatCard label="Encontros" value={data.totalMeetings ?? 0} icon="calendar-outline" />
          </Row>
          <Card tone="ink">
            <Row>
              <View style={{ flex: 1 }}>
                <Text variant="labelMedium" style={{ color: colors.tabInactive }}>
                  Presença média
                </Text>
                <Text variant="displaySmall" style={{ color: colors.white }}>
                  {Math.round(data.avgAttendance ?? 0)}%
                </Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                {best ? (
                  <Text variant="bodySmall" style={{ color: colors.goldLight }}>
                    Melhor: {best.name} ({Math.round(best.attendanceRate)}%)
                  </Text>
                ) : null}
                {worst ? (
                  <Text variant="bodySmall" style={{ color: colors.tabInactive }}>
                    Atenção: {worst.name} ({Math.round(worst.attendanceRate)}%)
                  </Text>
                ) : null}
              </View>
            </Row>
          </Card>
          {onExportCsv ? <BrandButton variant="ghost" icon="file-delimited-outline" label={exporting ? 'A exportar…' : 'Exportar CSV'} loading={exporting} disabled={exporting} onPress={onExportCsv} testID="export-csv" /> : null}

          <SectionHeader title="Ranking de presença" icon="podium" />
          {ranking.length === 0 ? (
            <EmptyState icon="chart-box-outline" title="Sem dados" body="Ainda não há encontros com presenças registadas." />
          ) : (
            <ListCard>
              {ranking.map((row, index) => (
                <ListRow
                  key={row.id}
                  testID={`report-class-${row.id}`}
                  left={
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: index === 0 && row.totalMeetings > 0 ? colors.gold : colors.paper, alignItems: 'center', justifyContent: 'center' }}>
                      <Text variant="labelMedium" style={{ color: colors.ink, fontWeight: '700' }}>
                        {index + 1}
                      </Text>
                    </View>
                  }
                  title={row.name}
                  subtitle={
                    row.totalMeetings > 0
                      ? `${row.totalEnrolled} insc. · ${row.totalMeetings} enc. · ${row.presentCount} pres. · ${row.absentCount} faltas${row.lastMeetingDate ? `\nÚltimo encontro: ${formatDate(row.lastMeetingDate)}` : ''}`
                      : `${row.totalEnrolled} inscritos · sem encontros`
                  }
                  right={<Tag label={row.totalMeetings > 0 ? `${Math.round(row.attendanceRate)}%` : '—'} tone={row.attendanceRate >= 75 ? 'success' : row.attendanceRate >= 50 ? 'warning' : row.totalMeetings > 0 ? 'danger' : 'neutral'} />}
                  onPress={() => onOpenClass(row.id)}
                  last={index === ranking.length - 1}
                />
              ))}
            </ListCard>
          )}
          {withMeetings.length > 0 ? (
            <>
              <SectionHeader title="Taxa de presença por turma" icon="chart-bar" />
              <Card>
                {withMeetings.map((row, index) => (
                  <View key={`bar-${row.id}`} style={{ marginBottom: index === withMeetings.length - 1 ? 0 : spacing.md }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text variant="labelLarge" style={{ color: colors.ink, flex: 1 }} numberOfLines={1}>
                        {row.name}
                      </Text>
                      <Text variant="labelMedium" style={{ color: colors.muted }}>
                        {Math.round(row.attendanceRate)}%
                      </Text>
                    </Row>
                    <RateBar value={row.attendanceRate} />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

export function reportsToCsv(rows: ClassReportRow[]): string {
  const header = ['Turma', 'Inscritos', 'Encontros', 'Presenças', 'Faltas', 'Taxa de presença (%)', 'Último encontro'];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((row) =>
    [row.name, row.totalEnrolled, row.totalMeetings, row.presentCount, row.absentCount, Math.round(row.attendanceRate), row.lastMeetingDate ? row.lastMeetingDate.slice(0, 10) : ''].map(escape).join(';'),
  );
  return [header.map(escape).join(';'), ...lines].join('\n');
}
