import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { canManagePastoral } from '../../../src/lib/roleAccess';
import { appRoutes } from '../../../src/navigation/routes';
import { CatechumenProfileScreen } from '../../../src/screens/PeopleProfileScreens';

export default function CatechumenDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, bootstrap, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.catechumenDetails(String(id)), [id]);
  const nav = workspaceNavContext(bootstrap, workspaceId);

  return (
    <CatechumenProfileScreen
      data={data}
      loading={loading}
      error={error}
      canWrite={canManagePastoral(nav.role, nav.isAdmin)}
      onOpenClass={(classId) => router.push(`/(app)/class/${classId}`)}
      onOpenFamily={(familyId) => router.push(`/(app)/families/${familyId}`)}
      onEdit={() =>
        router.push(
          appRoutes.form('catechumen', {
            id: String(id),
            firstName: data?.firstName,
            lastName: data?.lastName,
          }),
        )
      }
      onDelete={() => {
        Alert.alert('Apagar catequizando', 'Esta acção não se desfaz.', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Apagar',
            style: 'destructive',
            onPress: async () => {
              await api.deleteCatechumen(String(id));
              router.back();
            },
          },
        ]);
      }}
    />
  );
}
