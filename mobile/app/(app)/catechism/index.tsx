import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatechismHomeScreen } from '../../../src/screens/ReferenceScreens';

export default function CatechismRoute() {
  const { entry } = useLocalSearchParams<{ entry?: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const entries = useAsync(() => (category ? api.catechismCategory(category) : Promise.resolve([])), [category]);

  useEffect(() => {
    if (entry) router.replace(`/(app)/catechism/${entry}`);
  }, [entry]);

  return (
    <CatechismHomeScreen
      category={category}
      onChangeCategory={setCategory}
      entries={Array.isArray(entries.data) ? entries.data : []}
      loading={entries.loading}
      error={entries.error}
      onOpenEntry={(number) => router.push(`/(app)/catechism/${number}`)}
      onSearch={() => router.push('/(app)/catechism/search')}
    />
  );
}
