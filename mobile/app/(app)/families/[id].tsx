import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { FamilyDetailScreen } from '../../../src/screens/PastoralDirectoryScreens';

export default function FamilyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.familyDetails(String(id)), [id]);

  return <FamilyDetailScreen household={data} loading={loading} error={error} />;
}
