import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { BibleChapterScreen } from '../../../../src/screens/BibleScreens';

export default function BibleChapterRoute() {
  const { bookId, chapter } = useLocalSearchParams<{ bookId: string; chapter: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const chapterNumber = Number(chapter || 1);
  const { data, loading, error } = useAsync(
    () => api.bibleChapter(String(bookId), chapterNumber),
    [bookId, chapterNumber],
  );
  const access = useAsync(() => api.socialAccess(), []);

  return (
    <BibleChapterScreen
      chapter={data}
      loading={loading}
      error={error}
      canPublish={Boolean(access.data?.canPublish)}
      onShareVerse={(verseNumber) => {
        router.push({
          pathname: '/(app)/community/compose',
          params: { kind: 'VERSE', sourceId: `${bookId}:${chapterNumber}:${verseNumber}` },
        });
      }}
    />
  );
}
