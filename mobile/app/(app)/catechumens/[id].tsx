import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useMemo } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { catechumenDisplayName } from '../../../src/catechumens/catechumensPresentation';
import { appRoutes } from '../../../src/navigation/routes';
import { CatechumenDetailScreen } from '../../../src/screens/CatechumenDetailScreen';

export default function CatechumenDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const { data, loading, error } = useAsync(() => api.catechumenDetails(String(id)), [id, api]);

  const title = useMemo(() => (data ? catechumenDisplayName(data) : 'Catequizando'), [data]);

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  return (
    <CatechumenDetailScreen
      profile={data}
      loading={loading}
      error={error}
      onOpenClass={(classId) => router.push(appRoutes.classDetails(classId))}
      onOpenFamily={(householdId) => router.push(appRoutes.family(householdId))}
    />
  );
}
