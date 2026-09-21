import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { AttendanceScreen } from '../../../../src/screens/AttendanceScreen';

export default function AttendanceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meetingId = String(id);
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(
    () => api.meetingAttendanceSheet(meetingId),
    [meetingId, api],
  );
  const [saving, setSaving] = useState(false);

  return (
    <AttendanceScreen
      sheet={data}
      loading={loading}
      error={error}
      saving={saving}
      onSave={async (changes) => {
        setSaving(true);
        try {
          await api.saveAttendanceBatch({ meetingId, changes });
          await reload();
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
