import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems } from '../../src/lib/payload';
import { Card } from '../../src/components/ui';
import { DetailScreen } from '../../src/screens/DetailScreen';
import { colors } from '../../src/theme';

export default function ReportsRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => api.reports(workspaceId || undefined),
    [workspaceId],
  );

  const classReports = asItems(data, ['classReports']);
  const facts = [
    { label: 'Catequizandos inscritos', value: data?.totalEnrolled },
    { label: 'Presença média', value: data?.avgAttendance != null ? `${data.avgAttendance}%` : null },
    { label: 'Encontros', value: data?.totalMeetings },
    { label: 'Turmas', value: classReports.length || data?.classReports?.length },
  ].filter((row) => row.value != null);

  return (
    <DetailScreen
      testID="reports-screen"
      title="Relatórios"
      subtitle="Visão de presença deste espaço. Exportações e análises longas ficam na web."
      loading={loading}
      error={error}
    >
      {facts.map((row) => (
        <Card key={row.label}>
          <Text style={{ color: colors.muted }}>{row.label}</Text>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 22, marginTop: 4 }}>
            {String(row.value)}
          </Text>
        </Card>
      ))}
      {classReports.map((row: any) => {
        const id = row.id;
        const inner = (
          <Card>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{row.name || 'Turma'}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {row.attendanceRate != null ? `${row.attendanceRate}% de presença` : 'Sem presença'}
              {row.totalEnrolled != null ? ` · ${row.totalEnrolled} inscritos` : ''}
              {row.totalMeetings != null ? ` · ${row.totalMeetings} encontros` : ''}
            </Text>
          </Card>
        );
        if (!id) return <React.Fragment key={row.name}>{inner}</React.Fragment>;
        return (
          <Pressable
            key={id}
            testID={`report-class-${id}`}
            onPress={() => router.push(`/(app)/class/${id}`)}
          >
            {inner}
          </Pressable>
        );
      })}
    </DetailScreen>
  );
}
