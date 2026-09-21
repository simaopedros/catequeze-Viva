import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { JourneyDetailScreen } from '../../../src/screens/JourneyScreen';

export default function JourneyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.journey(String(id)), [id]);
  const [busy, setBusy] = useState(false);

  return (
    <JourneyDetailScreen
      journey={data}
      loading={loading}
      error={error}
      busy={busy}
      onToggle={async (milestoneId, status) => {
        setBusy(true);
        try {
          await api.updateMilestone(milestoneId, status);
          await reload();
        } catch (err) {
          Alert.alert('Jornada', err instanceof Error ? err.message : 'Não foi possível atualizar o marco.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
