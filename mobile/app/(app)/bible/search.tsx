import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useDebouncedSearch } from '../../../src/hooks/useDebouncedSearch';
import { ReferenceSearchScreen } from '../../../src/screens/ReferenceScreens';

export default function BibleSearchRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const search = useDebouncedSearch((q) => api.bibleSearch(q, 40), 2);

  return (
    <ReferenceSearchScreen
      title="Pesquisar na Bíblia"
      subtitle="Palavras ou expressões nos versículos."
      placeholder="Ex.: misericórdia"
      query={search.query}
      onChangeQuery={search.setQuery}
      loading={search.loading}
      error={search.error}
      results={(search.results ?? []).map((verse: any) => ({
        id: verse.id,
        title: `${verse.chapter?.book?.name || verse.bookName || ''} ${verse.chapter?.number ?? verse.chapterNumber ?? ''}:${verse.number}`,
        body: verse.text,
        onPress: () => {
          const bookId = verse.chapter?.book?.id || verse.bookId;
          const chapter = verse.chapter?.number ?? verse.chapterNumber;
          if (bookId && chapter) router.push(`/(app)/bible/${bookId}/${chapter}`);
        },
      }))}
      minChars={2}
      testID="bible-search-screen"
    />
  );
}
