import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { JourneyDetailScreen } from '../../../src/screens/ContentScreens';

export default function JourneyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(() => api.journeyDetails(String(id)), [id]);

  return (
    <JourneyDetailScreen
      journey={data}
      loading={loading}
      error={error}
      busyId={busyId}
      onToggleMilestone={async (milestoneId, completed) => {
        setBusyId(milestoneId);
        try {
          await api.updateJourneyMilestone(milestoneId, completed ? 'COMPLETED' : 'PENDING');
          await reload();
        } finally {
          setBusyId(null);
        }
      }}
    />
  );
}
