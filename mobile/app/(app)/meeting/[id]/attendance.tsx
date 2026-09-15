import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { AttendanceScreen } from '../../../../src/screens/AttendanceScreen';

export default function AttendanceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.meetingAttendance(String(id)), [id]);
  const [busy, setBusy] = useState(false);

  return (
    <AttendanceScreen
      key={String(id)}
      meeting={data}
      loading={loading}
      error={error}
      busy={busy}
      onSelectMeeting={(meetingId) => router.replace(`/(app)/meeting/${meetingId}/attendance`)}
      onSave={async (catechumenProfileId, status) => {
        setBusy(true);
        try {
          await api.saveAttendance({ meetingId: String(id), catechumenProfileId, status });
          await reload();
        } catch (err) {
          Alert.alert('Presença', err instanceof Error ? err.message : 'Não foi possível gravar.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
