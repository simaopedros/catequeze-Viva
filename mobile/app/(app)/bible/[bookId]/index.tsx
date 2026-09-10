import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { BibleBookScreen } from '../../../../src/screens/BibleScreens';

export default function BibleBookRoute() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.bibleBook(String(bookId)), [bookId]);

  return (
    <BibleBookScreen
      book={data}
      loading={loading}
      error={error}
      onOpenChapter={(chapter) => router.push(`/(app)/bible/${bookId}/${chapter}`)}
    />
  );
}
