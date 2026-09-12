import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { personName, statusLabel } from '../../../src/lib/payload';
import { Card } from '../../../src/components/ui';
import { DetailScreen } from '../../../src/screens/DetailScreen';
import { colors } from '../../../src/theme';

export default function GroupDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.groupDetails(String(id)), [id]);
  const notices = data?.notices || data?.posts || [];

  return (
    <DetailScreen
      testID="group-detail-screen"
      title={personName(data, 'Grupo')}
      subtitle={[statusLabel(data?.kind), data?.city].filter(Boolean).join(' · ')}
      loading={loading}
      error={error}
      rows={[{ label: 'Descrição', value: data?.description }]}
    >
      {notices.map((row: any) => (
        <Card key={row.id}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{row.title || 'Aviso'}</Text>
          {row.body ? <Text style={{ color: colors.muted, marginTop: 6 }}>{row.body}</Text> : null}
        </Card>
      ))}
    </DetailScreen>
  );
}
