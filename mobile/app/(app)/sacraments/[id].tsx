import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { SacramentalJourneyScreen } from '../../../src/screens/SecondaryScreens';

export default function SacramentalJourneyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.sacramentalJourney(String(id)), [id]);
  return <SacramentalJourneyScreen data={data} loading={loading} error={error} onOpenCatechumen={(catechumenId) => router.push(`/(app)/catechumen/${catechumenId}`)} />;
}
