import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { AttendanceScreen } from '../../../../src/screens/AttendanceScreen';

export default function AttendanceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.attendanceSheet(String(id)), [id]);
  const [busy, setBusy] = useState(false);

  return (
    <AttendanceScreen
      sheet={data}
      loading={loading}
      error={error}
      busy={busy}
      onSave={async (catechumenProfileId, status) => {
        setBusy(true);
        try {
          await api.saveAttendance({ meetingId: String(id), catechumenProfileId, status });
          await reload();
        } catch (err) {
          Alert.alert('Presença', err instanceof Error ? err.message : 'Não foi possível salvar.');
        } finally {
          setBusy(false);
        }
      }}
      onSaveAllPresent={async () => {
        const rows = data?.participants || [];
        setBusy(true);
        try {
          for (const row of rows) {
            const profileId = row.catechumenProfileId || row.id;
            if (profileId) {
              await api.saveAttendance({ meetingId: String(id), catechumenProfileId: profileId, status: 'PRESENT' });
            }
          }
          await reload();
        } catch (err) {
          Alert.alert('Presença', err instanceof Error ? err.message : 'Não foi possível salvar.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
