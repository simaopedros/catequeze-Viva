import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BibleBookScreen, BibleBooksScreen, BibleChapterScreen } from '../screens/BibleScreens';

describe('Bible screens', () => {
  it('mostra hero e filtros na lista de livros', () => {
    const view = render(
      <BibleBooksScreen books={[{ id: 'gn', name: 'Gênesis', testament: 'OT', position: 1 }]} onOpen={() => {}} />,
    );
    expect(view.getByTestId('bible-hero')).toBeTruthy();
    expect(view.getByTestId('bible-filter-ot')).toBeTruthy();
    expect(view.getByTestId('bible-book-gn')).toBeTruthy();
  });

  it('filtra para o Novo Testamento', () => {
    const view = render(
      <BibleBooksScreen
        books={[
          { id: 'gn', name: 'Gênesis', testament: 'OT', position: 1 },
          { id: 'mt', name: 'Mateus', testament: 'NT', position: 47 },
        ]}
        onOpen={() => {}}
      />,
    );
    fireEvent.press(view.getByTestId('bible-filter-nt'));
    expect(view.getByTestId('bible-book-mt')).toBeTruthy();
    expect(view.queryByTestId('bible-book-gn')).toBeNull();
  });

  it('renderiza grelha de capítulos', () => {
    const onOpenChapter = jest.fn();
    const view = render(
      <BibleBookScreen
        book={{ id: 'gn', name: 'Gênesis', testament: 'OT', chapters: [{ id: '1', number: 1 }] }}
        onOpenChapter={onOpenChapter}
      />,
    );
    fireEvent.press(view.getByTestId('bible-chapter-1'));
    expect(onOpenChapter).toHaveBeenCalledWith(1);
  });

  it('renderiza versículos com partilha', () => {
    const onShare = jest.fn();
    const view = render(
      <BibleChapterScreen
        chapter={{
          number: 1,
          book: { id: 'gn', name: 'Gênesis' },
          verses: [{ number: 1, text: 'No princípio…' }],
        }}
        canPublish
        onShareVerse={onShare}
      />,
    );
    fireEvent.press(view.getByText('Partilhar'));
    expect(onShare).toHaveBeenCalledWith(1, 'No princípio…');
  });
});
