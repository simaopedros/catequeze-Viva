import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { PeopleListScreen } from '../../../src/screens/PeopleScreens';

export default function CatechumensRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.catechumens(), []);
  return (
    <PeopleListScreen
      testID="catechumens-screen"
      title="Catequizandos"
      subtitle="Consulta rápida. A edição continua na web."
      payload={data}
      loading={loading}
      error={error}
      onOpen={(id) => router.push(`/(app)/catechumens/${id}`)}
    />
  );
}
