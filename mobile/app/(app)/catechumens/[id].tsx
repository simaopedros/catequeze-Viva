import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatechumenDetailScreen } from '../../../src/screens/PastoralDirectoryScreens';

export default function CatechumenDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.catechumenDetails(String(id)), [id]);

  return <CatechumenDetailScreen profile={data} loading={loading} error={error} />;
}
