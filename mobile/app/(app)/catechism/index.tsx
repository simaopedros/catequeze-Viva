import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { CatechismHomeScreen } from '../../../src/screens/CatechismScreens';

export default function CatechismRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <CatechismHomeScreen
      entries={entries}
      loading={loading}
      error={error}
      onOpenEntry={(number) => router.push(`/(app)/catechism/${number}`)}
      onOpenCategory={async (category) => {
        setLoading(true);
        setError(null);
        try {
          setEntries(await api.catechismCategory(category));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar.');
        } finally {
          setLoading(false);
        }
      }}
      onSearch={async (query) => {
        if (query.trim().length < 3) {
          setError('Digite pelo menos 3 letras.');
          return;
        }
        setLoading(true);
        setError(null);
        try {
          setEntries(await api.searchCatechism(query.trim()));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Não foi possível buscar.');
        } finally {
          setLoading(false);
        }
      }}
    />
  );
}
