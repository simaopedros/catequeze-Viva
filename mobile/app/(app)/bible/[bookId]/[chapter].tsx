import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Share } from 'react-native';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useFeedback } from '../../../../src/components/Feedback';
import { useAsync } from '../../../../src/hooks/useAsync';
import { BibleChapterScreen } from '../../../../src/screens/BibleScreens';
import { pushRecent, toggleFavorite } from '../../../../src/storage/readingPrefs';

export default function BibleChapterRoute() {
  const { bookId, chapter } = useLocalSearchParams<{ bookId: string; chapter: string }>();
  const { api } = useAuth();
  const { notify } = useFeedback();
  const router = useRouter();
  const chapterNumber = Number(chapter || 1);
  const { data, loading, error } = useAsync(() => api.bibleChapter(String(bookId), chapterNumber), [bookId, chapterNumber]);
  const access = useAsync(() => api.socialAccess(), []);
  const totalChapters: number | undefined = (data?.book as any)?.chapterCount ?? (data?.book as any)?.chapters?.length;

  useEffect(() => {
    if (data?.book?.name) void pushRecent({ bookId: String(bookId), bookName: data.book.name, chapter: chapterNumber });
  }, [data?.book?.name, bookId, chapterNumber]);

  return (
    <BibleChapterScreen
      chapter={data}
      loading={loading}
      error={error}
      canPublish={Boolean(access.data?.canPublish)}
      onPrev={chapterNumber > 1 ? () => router.replace(`/(app)/bible/${bookId}/${chapterNumber - 1}`) : undefined}
      onNext={!totalChapters || chapterNumber < totalChapters ? () => router.replace(`/(app)/bible/${bookId}/${chapterNumber + 1}`) : undefined}
      onShareVerse={(verseNumber) => {
        router.push({ pathname: '/(app)/community/compose', params: { kind: 'VERSE', sourceId: `${bookId}:${chapterNumber}:${verseNumber}` } });
      }}
      onShareVerseOS={(verseNumber, text) => {
        const reference = `${data?.book?.name || bookId} ${chapterNumber}:${verseNumber}`;
        void Share.share({ message: `"${text}" — ${reference}` }).catch(() => undefined);
      }}
      onCopyVerse={async (verseNumber, text) => {
        const reference = `${data?.book?.name || bookId} ${chapterNumber}:${verseNumber}`;
        await Clipboard.setStringAsync(`"${text}" — ${reference}`).catch(() => undefined);
        notify('Versículo copiado.', 'success');
      }}
      onToggleFavorite={async (verseNumber, text) => {
        const added = await toggleFavorite({ bookId: String(bookId), bookName: data?.book?.name || String(bookId), chapter: chapterNumber, verse: verseNumber, text });
        notify(added ? 'Guardado nos favoritos.' : 'Removido dos favoritos.', 'success');
      }}
    />
  );
}
