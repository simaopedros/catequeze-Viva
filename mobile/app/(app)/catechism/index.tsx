import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { CatechismHomeScreen } from '../../../src/screens/ContentScreens';

export default function CatechismRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  return (
    <CatechismHomeScreen
      results={results}
      searching={searching}
      onOpenCategory={(category) => {
        api.catechismCategory(category).then((payload) => setResults(payload.results ?? []));
      }}
      onSearch={async (q) => {
        if (q.trim().length < 2) return;
        setSearching(true);
        try {
          const payload = await api.searchCatechism(q.trim());
          setResults(payload.results ?? []);
        } finally {
          setSearching(false);
        }
      }}
    />
  );
}
