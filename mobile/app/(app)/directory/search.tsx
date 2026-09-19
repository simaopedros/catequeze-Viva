import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useDebouncedSearch } from '../../../src/hooks/useDebouncedSearch';
import { ReferenceSearchScreen } from '../../../src/screens/ReferenceScreens';

export default function DirectorySearchRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const search = useDebouncedSearch((q) => api.directorySearch(q, 40), 2);

  return (
    <ReferenceSearchScreen
      title="Pesquisar no Diretório"
      subtitle="Orientações para a catequese."
      placeholder="Ex.: família"
      query={search.query}
      onChangeQuery={search.setQuery}
      loading={search.loading}
      error={search.error}
      results={(search.results ?? []).map((entry: any) => ({
        id: entry.id || String(entry.number),
        title: entry.title || `n. ${entry.number}`,
        body: entry.content,
        meta: `n. ${entry.number}`,
        onPress: () => router.push(`/(app)/directory/${entry.number}`),
      }))}
      testID="directory-search-screen"
    />
  );
}
