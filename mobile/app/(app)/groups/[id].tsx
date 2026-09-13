import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Text } from 'react-native';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { personName, statusLabel } from '../../../src/lib/payload';
import { canManagePastoral } from '../../../src/lib/roleAccess';
import { BrandButton, Card } from '../../../src/components/ui';
import { DetailScreen } from '../../../src/screens/DetailScreen';
import { colors } from '../../../src/theme';

export default function GroupDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, bootstrap, workspaceId } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.groupDetails(String(id)), [id]);
  const notices = data?.notices || data?.posts || [];
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const canWrite = canManagePastoral(nav.role, nav.isAdmin);

  return (
    <DetailScreen
      testID="group-detail-screen"
      title={personName(data, 'Grupo')}
      subtitle={[statusLabel(data?.kind), data?.city].filter(Boolean).join(' · ')}
      loading={loading}
      error={error}
      rows={[{ label: 'Descrição', value: data?.description }]}
    >
      {canWrite ? (
        <BrandButton
          label="Juntar-me"
          onPress={async () => {
            try {
              await api.joinGroup(String(id));
              await reload();
            } catch (err) {
              Alert.alert('Não foi possível juntar', err instanceof Error ? err.message : '');
            }
          }}
          testID="group-join"
        />
      ) : null}
      {notices.map((row: any) => (
        <Card key={row.id}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{row.title || 'Aviso'}</Text>
          {row.body ? <Text style={{ color: colors.muted, marginTop: 6 }}>{row.body}</Text> : null}
        </Card>
      ))}
    </DetailScreen>
  );
}
