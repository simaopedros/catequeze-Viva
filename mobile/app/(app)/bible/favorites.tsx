import { useRouter } from 'expo-router';
import React from 'react';
import { useFeedback } from '../../../src/components/Feedback';
import { useAsync } from '../../../src/hooks/useAsync';
import { BibleFavoritesScreen } from '../../../src/screens/ReferenceScreens';
import { listFavorites, toggleFavorite } from '../../../src/storage/readingPrefs';

export default function BibleFavoritesRoute() {
  const router = useRouter();
  const { notify } = useFeedback();
  const favorites = useAsync(() => listFavorites(), []);

  return (
    <BibleFavoritesScreen
      items={favorites.data ?? []}
      loading={favorites.loading}
      onOpen={(item) => router.push(`/(app)/bible/${item.bookId}/${item.chapter}`)}
      onRemove={async (item) => {
        await toggleFavorite(item);
        notify('Removido dos favoritos.', 'info');
        await favorites.reload();
      }}
    />
  );
}
