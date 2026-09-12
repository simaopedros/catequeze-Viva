import React, { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { BrandButton, EmptyState, LoadingState, PersonRow, Screen, ScreenTitle } from '../components/ui';
import { ShareCard } from '../components/PostCard';
import type { BibleBook, BibleChapter } from '../api/types';
import { colors, fonts, spacing } from '../theme';

export function BibleBooksScreen({
  books,
  loading,
  error,
  onOpen,
}: {
  books: BibleBook[];
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <Screen testID="bible-books-screen">
      <ScreenTitle title="Bíblia" subtitle="Leia em voz alta. Toque num livro para o capítulo." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Bíblia indisponível" body={error} /> : null}
      {books.map((book) => (
        <PersonRow
          key={book.id}
          testID={`bible-book-${book.id}`}
          name={book.name}
          hint={book.testament || ''}
          onPress={() => onOpen(book.id)}
        />
      ))}
    </Screen>
  );
}

export function BibleBookScreen({
  book,
  loading,
  error,
  onOpenChapter,
}: {
  book?: BibleBook | null;
  loading?: boolean;
  error?: string | null;
  onOpenChapter: (chapter: number) => void;
}) {
  const chapters = book?.chapters ?? [];
  return (
    <Screen testID="bible-book-screen">
      <ScreenTitle title={book?.name || 'Livro'} />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Livro indisponível" body={error} /> : null}
      {chapters.length === 0 && !loading ? (
        <EmptyState title="Sem capítulos" body="Este livro ainda não tem capítulos no cache." />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {chapters.map((chapter) => (
            <Pressable
              key={chapter.id || chapter.number}
              onPress={() => onOpenChapter(chapter.number)}
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 12,
                backgroundColor: colors.canvas,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>{chapter.number}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

export function BibleChapterScreen({
  chapter,
  loading,
  error,
  canPublish,
  onShareVerse,
}: {
  chapter?: BibleChapter | null;
  loading?: boolean;
  error?: string | null;
  canPublish?: boolean;
  onShareVerse: (verseNumber: number, text: string) => void;
}) {
  const [selected, setSelected] = useState<{ number: number; text: string } | null>(null);
  const title = chapter?.book?.name
    ? `${chapter.book.name} ${chapter.number}`
    : `Capítulo ${chapter?.number ?? ''}`;

  return (
    <Screen
      testID="bible-chapter-screen"
      ink
      footer={
        selected ? (
          <View>
            <ShareCard
              ink
              kind="Versículo"
              title={`${chapter?.book?.name || ''} ${chapter?.number}:${selected.number}`}
              excerpt={selected.text}
            />
            <BrandButton
              label="Partilhar cartão"
              onPress={() => {
                const reference = `${chapter?.book?.name || ''} ${chapter?.number}:${selected.number}`;
                void Share.share({ message: `${reference}\n${selected.text}` });
              }}
            />
            {canPublish ? (
              <BrandButton
                variant="ghost"
                ink
                label="Partilhar na Comunidade"
                onPress={() => onShareVerse(selected.number, selected.text)}
              />
            ) : null}
          </View>
        ) : null
      }
    >
      <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: colors.cream, marginBottom: 8 }}>{title}</Text>
      <Text style={{ color: colors.gold, fontFamily: fonts.sansMedium, marginBottom: spacing.md }}>
        Toque num versículo para o destacar e partilhar.
      </Text>
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Capítulo indisponível" body={error} /> : null}
      {(chapter?.verses || []).map((verse) => {
        const active = selected?.number === verse.number;
        return (
          <Pressable
            key={verse.number}
            onPress={() => setSelected({ number: verse.number, text: verse.text })}
            style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}
          >
            <Text style={{ color: colors.gold, fontFamily: fonts.sansBold, width: 28 }}>{verse.number}</Text>
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.serifRegular,
                fontSize: 22,
                lineHeight: 34,
                color: active ? colors.gold : colors.cream,
              }}
            >
              {verse.text}
            </Text>
          </Pressable>
        );
      })}
    </Screen>
  );
}
