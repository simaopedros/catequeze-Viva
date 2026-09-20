import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { copy } from '../../../../src/copy/ptBR';
import { useToast } from '../../../../src/feedback/Toast';
import { hapticSuccess } from '../../../../src/feedback/haptics';
import { useAsync } from '../../../../src/hooks/useAsync';
import { AttendanceScreen } from '../../../../src/screens/AttendanceScreen';

export default function AttendanceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.meetingDetails(String(id)), [id]);
  const [busy, setBusy] = useState(false);

  return (
    <AttendanceScreen
      meeting={data}
      loading={loading}
      error={error}
      busy={busy}
      onSave={async (catechumenProfileId, status) => {
        setBusy(true);
        try {
          await api.saveAttendance({ meetingId: String(id), catechumenProfileId, status });
          await reload();
          void hapticSuccess();
          toast.show(copy.attendance.saved);
        } catch (err) {
          toast.show(err instanceof Error ? err.message : copy.attendance.saveError, 'error');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
