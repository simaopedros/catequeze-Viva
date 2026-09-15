import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { personName, statusLabel } from '../../../src/lib/payload';
import { canManagePastoral } from '../../../src/lib/roleAccess';
import { appRoutes } from '../../../src/navigation/routes';
import { BrandButton, Card } from '../../../src/components/ui';
import { DetailScreen } from '../../../src/screens/DetailScreen';
import { colors } from '../../../src/theme';

export default function SacramentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, bootstrap, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.sacramentDetails(String(id)), [id]);
  const milestones = data?.milestones || [];
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const canWrite = canManagePastoral(nav.role, nav.isAdmin);

  return (
    <DetailScreen
      testID="sacrament-detail-screen"
      title={data?.template?.name || data?.sacrament?.name || 'Jornada'}
      subtitle={personName(data?.catechumenProfile || data?.catechumen)}
      loading={loading}
      error={error}
    >
      {canWrite ? (
        <BrandButton
          label="Editar jornada"
          onPress={() => router.push(appRoutes.form('sacrament', { id: String(id) }))}
        />
      ) : null}
      {milestones.map((row: any) => (
        <Pressable
          key={row.id}
          onPress={() =>
            canWrite
              ? router.push(appRoutes.form('milestone', { id: row.id, milestoneId: row.id, status: row.status }))
              : undefined
          }
        >
          <Card>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{row.title || row.name || 'Marco'}</Text>
            <Text style={{ color: colors.muted }}>{statusLabel(row.status)}</Text>
          </Card>
        </Pressable>
      ))}
    </DetailScreen>
  );
}
