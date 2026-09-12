import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { personName } from '../../../src/lib/payload';
import { Card } from '../../../src/components/ui';
import { DetailScreen } from '../../../src/screens/DetailScreen';
import { colors } from '../../../src/theme';

export default function FamilyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const { data, loading, error } = useAsync(() => api.familyDetails(String(id), workspaceId || undefined), [id, workspaceId]);

  return (
    <DetailScreen
      testID="family-detail-screen"
      title={personName(data, 'Família')}
      subtitle={data?.parish?.name || data?.community?.name}
      loading={loading}
      error={error}
    >
      {(data?.guardians || []).map((row: any) => (
        <Card key={row.id || row.user?.id}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{personName(row.user || row)}</Text>
          <Text style={{ color: colors.muted }}>{row.user?.email || 'Encarregado de educação'}</Text>
        </Card>
      ))}
      {(data?.catechumens || data?.dependents || []).map((row: any) => (
        <Card key={row.id}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{personName(row)}</Text>
        </Card>
      ))}
    </DetailScreen>
  );
}
