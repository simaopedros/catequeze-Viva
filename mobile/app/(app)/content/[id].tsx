import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { personName, statusLabel } from '../../../src/lib/payload';
import { Card } from '../../../src/components/ui';
import { DetailScreen } from '../../../src/screens/DetailScreen';
import { colors } from '../../../src/theme';

export default function ContentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.contentDetails(String(id)), [id]);
  const activities = data?.activities || [];

  return (
    <DetailScreen
      testID="content-detail-screen"
      title={personName(data, 'Conteúdo')}
      subtitle={statusLabel(data?.status)}
      loading={loading}
      error={error}
      rows={[
        { label: 'Autor', value: data?.createdBy ? personName(data.createdBy) : null },
        { label: 'Actividades', value: activities.length ? String(activities.length) : null },
      ]}
    >
      {data?.summary || data?.description ? (
        <Card>
          <Text style={{ color: colors.muted }}>{data.summary || data.description}</Text>
        </Card>
      ) : null}
      {activities.map((activity: any) => (
        <Card key={activity.id}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{activity.title || activity.type}</Text>
        </Card>
      ))}
    </DetailScreen>
  );
}
