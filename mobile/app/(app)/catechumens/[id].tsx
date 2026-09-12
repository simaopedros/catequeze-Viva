import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { formatDate, personName, statusLabel } from '../../../src/lib/payload';
import { Card } from '../../../src/components/ui';
import { DetailScreen } from '../../../src/screens/DetailScreen';
import { colors } from '../../../src/theme';

export default function CatechumenDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.catechumenDetails(String(id)), [id]);

  return (
    <DetailScreen
      testID="catechumen-detail-screen"
      title={personName(data, 'Catequizando')}
      subtitle={data?.parish?.name}
      loading={loading}
      error={error}
      rows={[
        { label: 'Família', value: data?.household?.name },
        { label: 'Nascimento', value: formatDate(data?.birthDate) },
        { label: 'E-mail', value: data?.email },
      ]}
    >
      {(data?.enrollments || []).map((row: any) => (
        <Pressable
          key={row.id}
          onPress={() => row.class?.id && router.push(`/(app)/class/${row.class.id}`)}
        >
          <Card>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{row.class?.name || 'Turma'}</Text>
            <Text style={{ color: colors.muted }}>{statusLabel(row.status)}</Text>
          </Card>
        </Pressable>
      ))}
    </DetailScreen>
  );
}
