import React from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { Card } from '../../src/components/ui';
import { DetailScreen } from '../../src/screens/DetailScreen';
import { colors } from '../../src/theme';

export default function ReportsRoute() {
  const { api, workspaceId } = useAuth();
  const { data, loading, error } = useAsync(
    () => api.reports(workspaceId || undefined),
    [workspaceId],
  );

  const facts = [
    { label: 'Catequizandos inscritos', value: data?.totalEnrolled },
    { label: 'Presença média', value: data?.avgAttendance != null ? `${data.avgAttendance}%` : null },
    { label: 'Encontros', value: data?.totalMeetings },
    { label: 'Turmas', value: data?.classReports?.length },
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
    </DetailScreen>
  );
}
