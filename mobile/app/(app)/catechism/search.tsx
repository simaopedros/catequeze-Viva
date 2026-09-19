import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useDebouncedSearch } from '../../../src/hooks/useDebouncedSearch';
import { ReferenceSearchScreen } from '../../../src/screens/ReferenceScreens';

export default function CatechismSearchRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const search = useDebouncedSearch((q) => api.catechismSearch(q, 40), 3);

  return (
    <ReferenceSearchScreen
      title="Pesquisar no Catecismo"
      subtitle="Perguntas e respostas (mínimo 3 letras)."
      placeholder="Ex.: batismo"
      query={search.query}
      onChangeQuery={search.setQuery}
      loading={search.loading}
      error={search.error}
      minChars={3}
      results={(search.results ?? []).map((entry: any) => ({
        id: entry.id || String(entry.number),
        title: entry.question,
        body: entry.answer,
        meta: `§ ${entry.number}`,
        onPress: () => router.push(`/(app)/catechism/${entry.number}`),
      }))}
      testID="catechism-search-screen"
    />
  );
}
