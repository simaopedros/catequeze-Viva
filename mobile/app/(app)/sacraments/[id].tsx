import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { personName, statusLabel } from '../../../src/lib/payload';
import { Card } from '../../../src/components/ui';
import { DetailScreen } from '../../../src/screens/DetailScreen';
import { colors } from '../../../src/theme';

export default function SacramentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.sacramentDetails(String(id)), [id]);
  const milestones = data?.milestones || [];

  return (
    <DetailScreen
      testID="sacrament-detail-screen"
      title={data?.template?.name || data?.sacrament?.name || 'Jornada'}
      subtitle={personName(data?.catechumenProfile || data?.catechumen)}
      loading={loading}
      error={error}
    >
      {milestones.map((row: any) => (
        <Card key={row.id}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{row.title || row.name || 'Marco'}</Text>
          <Text style={{ color: colors.muted }}>{statusLabel(row.status)}</Text>
        </Card>
      ))}
    </DetailScreen>
  );
}
