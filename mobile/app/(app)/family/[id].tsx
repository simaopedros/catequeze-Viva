import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { FamilyScreen } from '../../../src/screens/FamilyScreen';

export default function FamilyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.familyDetails(String(id)), [id]);

  return (
    <FamilyScreen
      data={data}
      loading={loading}
      error={error}
      onOpenCatechumen={(catechumenId) => router.push(`/(app)/catechumen/${catechumenId}`)}
    />
  );
}
