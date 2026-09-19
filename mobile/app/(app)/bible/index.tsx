import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { BibleBooksScreen } from '../../../src/screens/BibleScreens';
import { listFavorites, listRecents } from '../../../src/storage/readingPrefs';

export default function BibleRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.bibleBooks(), []);
  const recents = useAsync(() => listRecents(), []);
  const favorites = useAsync(() => listFavorites(), []);

  useFocusEffect(
    useCallback(() => {
      void recents.reload();
      void favorites.reload();
    }, [recents.reload, favorites.reload]),
  );

  return (
    <BibleBooksScreen
      books={data ?? []}
      loading={loading}
      error={error}
      recents={recents.data ?? []}
      favoritesCount={favorites.data?.length ?? 0}
      onOpen={(bookId) => router.push(`/(app)/bible/${bookId}`)}
      onOpenRecent={(bookId, chapter) => router.push(`/(app)/bible/${bookId}/${chapter}`)}
      onSearch={() => router.push('/(app)/bible/search')}
      onOpenFavorites={() => router.push('/(app)/bible/favorites')}
    />
  );
}
