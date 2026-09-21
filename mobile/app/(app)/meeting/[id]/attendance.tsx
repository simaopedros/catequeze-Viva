import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { AttendanceScreen } from '../../../../src/screens/AttendanceScreen';
export default function AttendanceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.meetingDetails(String(id)), [id]);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const rows =
    data?.attendance || data?.records || data?.enrollments || data?.catechumens || [];

  return (
    <AttendanceScreen
      meeting={data}
      loading={loading}
      error={error}
      markingId={markingId}
      markingAll={markingAll}
      onMark={async (catechumenProfileId, status) => {
        setMarkingId(catechumenProfileId);
        try {
          await api.saveAttendance({ meetingId: String(id), catechumenProfileId, status });
        } finally {
          setMarkingId(null);
        }
      }}
      onMarkAllPresent={async () => {
        if (!rows.length) return;
        setMarkingAll(true);
        try {
          for (const row of rows) {
            const catechumenProfileId = row.catechumenProfileId || row.id;
            await api.saveAttendance({
              meetingId: String(id),
              catechumenProfileId,
              status: 'PRESENT',
            });
          }
          await reload();
        } catch (err) {
          Alert.alert('Presença', err instanceof Error ? err.message : 'Não foi possível gravar.');
        } finally {
          setMarkingAll(false);
        }
      }}
    />
  );
}
