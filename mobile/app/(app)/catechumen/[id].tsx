import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatechumenScreen } from '../../../src/screens/CatechumenScreen';

export default function CatechumenRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.catechumenDetails(String(id)), [id]);

  return (
    <CatechumenScreen
      data={data}
      loading={loading}
      error={error}
      onOpenFamily={(familyId) => router.push(`/(app)/family/${familyId}`)}
      onOpenClass={(classId) => router.push(`/(app)/class/${classId}`)}
    />
  );
}
