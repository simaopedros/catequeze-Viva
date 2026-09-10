import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostCard } from '../components/PostCard';
import type { SocialPost } from '../api/types';

const post = (overrides: Partial<SocialPost> = {}): SocialPost => ({
  id: 'p1',
  slug: 'paz',
  body: 'A'.repeat(320),
  author: { id: 'u1', handle: 'ana', displayName: 'Ana Silva', avatarUrl: null },
  share: {
    kind: 'VERSE',
    title: 'João 3,16',
    subtitle: 'Evangelho',
    excerpt: 'Porque Deus amou o mundo…',
    href: '/app/bible',
    sourceId: 'jo:3:16',
    sourceLabel: 'Versículo',
  },
  reactionCount: 3,
  commentCount: 1,
  ...overrides,
});

describe('PostCard', () => {
  it('collapses long text and opens the author profile', () => {
    const onOpenAuthor = jest.fn();
    const onOpenPost = jest.fn();
    const view = render(<PostCard post={post()} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />);

    expect(view.getByText('Ana Silva')).toBeTruthy();
    expect(view.getByText('@ana')).toBeTruthy();
    expect(view.getByText('João 3,16')).toBeTruthy();
    expect(view.getByText('Ver mais')).toBeTruthy();

    fireEvent.press(view.getByTestId('post-expand-p1'));
    expect(view.getByText('Ver menos')).toBeTruthy();

    fireEvent.press(view.getByTestId('post-author-p1'));
    expect(onOpenAuthor).toHaveBeenCalledWith('ana');
    fireEvent.press(view.getByTestId('post-p1'));
    expect(onOpenPost).toHaveBeenCalledWith('paz');
    fireEvent.press(view.getByTestId('open-post-p1'));
    expect(onOpenPost).toHaveBeenCalledTimes(2);
  });
});
