import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { BibleBooksScreen } from '../../../src/screens/BibleScreens';

export default function BibleRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.bibleBooks(), []);

  return (
    <BibleBooksScreen
      books={data ?? []}
      loading={loading}
      error={error}
      onOpen={(bookId) => router.push(`/(app)/bible/${bookId}`)}
    />
  );
}
