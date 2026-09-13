import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Text } from 'react-native';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { personName } from '../../../src/lib/payload';
import { canManageCoordinator } from '../../../src/lib/roleAccess';
import { appRoutes } from '../../../src/navigation/routes';
import { BrandButton, Card } from '../../../src/components/ui';
import { DetailScreen } from '../../../src/screens/DetailScreen';
import { colors } from '../../../src/theme';

export default function FormationTrackRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => api.formationTrack(String(id), workspaceId || undefined),
    [id, workspaceId],
  );
  const modules = data?.modules || [];
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const canWrite = canManageCoordinator(nav.role, nav.isAdmin);

  return (
    <DetailScreen
      testID="formation-track-screen"
      title={personName(data, 'Percurso')}
      subtitle={data?.kind}
      loading={loading}
      error={error}
    >
      {canWrite ? (
        <>
          <BrandButton
            label="Editar"
            onPress={() => router.push(appRoutes.form('formation', { id: String(id), name: data?.name }))}
          />
          <BrandButton
            variant="danger"
            label="Apagar percurso"
            onPress={() => {
              Alert.alert('Apagar formação', 'Esta acção não se desfaz.', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Apagar',
                  style: 'destructive',
                  onPress: async () => {
                    await api.deleteFormation(String(id), workspaceId || undefined);
                    router.back();
                  },
                },
              ]);
            }}
          />
        </>
      ) : null}
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
