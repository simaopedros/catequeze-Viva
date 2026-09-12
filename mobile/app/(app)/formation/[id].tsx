import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { personName } from '../../../src/lib/payload';
import { Card } from '../../../src/components/ui';
import { DetailScreen } from '../../../src/screens/DetailScreen';
import { colors } from '../../../src/theme';

export default function FormationTrackRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const { data, loading, error } = useAsync(
    () => api.formationTrack(String(id), workspaceId || undefined),
    [id, workspaceId],
  );
  const modules = data?.modules || [];

  return (
    <DetailScreen
      testID="formation-track-screen"
      title={personName(data, 'Percurso')}
      subtitle={data?.kind}
      loading={loading}
      error={error}
    >
      {modules.map((mod: any) => (
        <Card key={mod.id}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{mod.title || 'Módulo'}</Text>
          {(mod.lessons || []).map((lesson: any) => (
            <Text key={lesson.id} style={{ color: colors.muted, marginTop: 6 }}>
              {lesson.title || 'Lição'}
              {lesson.progress?.[0]?.completedAt ? ' · concluída' : ''}
            </Text>
          ))}
        </Card>
      ))}
    </DetailScreen>
  );
}
