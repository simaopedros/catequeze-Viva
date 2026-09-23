import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatechismEntryScreen } from '../../../src/screens/CatechismScreens';

export default function CatechismEntryRoute() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const { api } = useAuth();
  const parsed = Number(number);
  const { data, loading, error } = useAsync(
    () => api.catechismEntry(parsed),
    [parsed],
  );

  return <CatechismEntryScreen entry={data} loading={loading} error={error} />;
}
