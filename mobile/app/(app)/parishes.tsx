import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { useAuth, workspaceNavContext } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { planLabel } from '../../src/lib/billing';
import { asItems, personName, workspaceTypeLabel } from '../../src/lib/payload';
import { canManageCoordinator } from '../../src/lib/roleAccess';
import { appRoutes } from '../../src/navigation/routes';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function ParishesRoute() {
  const { api, bootstrap, workspaceId } = useAuth();
  const router = useRouter();
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const { data, loading, error, reload } = useAsync(() => api.parishes(), []);
  const canWrite = canManageCoordinator(nav.role, nav.isAdmin);
  const items = asItems(data, ['parishes']).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Paróquia'),
    subtitle: [
      row.diocese?.name,
      workspaceTypeLabel(row.type),
      row.billing?.plan ? planLabel(row.billing.plan) : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));

  return (
    <CatalogScreen
      testID="parishes-screen"
      title="Paróquias"
      subtitle="Espaços ligados à sua conta."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem paróquias"
      emptyBody="Quando a conta estiver ligada a um espaço, ele aparece aqui."
      canWrite={canWrite}
      createLabel="Nova paróquia"
      onCreate={() => router.push(appRoutes.form('parish'))}
      onOpen={(id) => {
        const row = asItems(data, ['parishes']).find((item: any) => item.id === id);
        Alert.alert(personName(row, 'Paróquia'), 'Editar ou remover este espaço?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Editar', onPress: () => router.push(appRoutes.form('parish', { id, name: row?.name })) },
          {
            text: 'Apagar',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Confirmar', 'Escreva DELETAR no formulário para remover.', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Continuar',
                  onPress: async () => {
                    try {
                      await api.deleteParish(id, 'DELETAR');
                      await reload();
                    } catch (err) {
                      Alert.alert('Não foi possível apagar', err instanceof Error ? err.message : '');
                    }
                  },
                },
              ]);
            },
          },
        ]);
      }}
    />
  );
}
