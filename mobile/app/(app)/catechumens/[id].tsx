import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatechumenProfileScreen } from '../../../src/screens/PeopleProfileScreens';

export default function CatechumenDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.catechumenDetails(String(id)), [id]);

  return (
    <CatechumenProfileScreen
      data={data}
      loading={loading}
      error={error}
      onOpenClass={(classId) => router.push(`/(app)/class/${classId}`)}
      onOpenFamily={(familyId) => router.push(`/(app)/families/${familyId}`)}
    />
  );
}
