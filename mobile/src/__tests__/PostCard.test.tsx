import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { PostCard } from '../components/PostCard';
import type { SocialPost } from '../api/types';
import { REPORT_REASONS, publicPostUrl } from '../lib/social';

const post = (overrides: Partial<SocialPost> = {}): SocialPost => ({
  id: 'p1',
  slug: 'paz',
  body: 'A'.repeat(320),
  author: { id: 'u1', handle: 'ana', displayName: 'Ana Silva', avatarUrl: 'https://cdn.example/ana.jpg' },
  share: {
    kind: 'VERSE',
    title: 'João 3,16',
    subtitle: 'Evangelho',
    excerpt: 'Porque Deus amou o mundo…',
    href: '/app/bible',
    sourceId: 'verse-uuid',
    sourceLabel: 'Versículo',
  },
  media: [{ id: 'm1', kind: 'IMAGE', url: 'https://cdn.example/foto.jpg' }],
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
    expect(view.getByTestId('post-gallery-p1')).toBeTruthy();

    fireEvent.press(view.getByTestId('post-expand-p1'));
    expect(view.getByText('Ver menos')).toBeTruthy();

    fireEvent.press(view.getByTestId('post-author-p1'));
    expect(onOpenAuthor).toHaveBeenCalledWith('ana');
    fireEvent.press(view.getByTestId('post-p1'));
    expect(onOpenPost).toHaveBeenCalledWith('paz');
    fireEvent.press(view.getByTestId('open-post-p1'));
    expect(onOpenPost).toHaveBeenCalledTimes(2);
  });

  it('reage, comenta, denuncia com 7 razões e oferece copiar link e WhatsApp', () => {
    const onReact = jest.fn();
    const onComment = jest.fn();
    const onReport = jest.fn();
    const onDelete = jest.fn();
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find((item) => item.style === 'destructive')?.onPress?.();
    });

    const view = render(
      <PostCard
        post={post({ isOwn: true })}
        onReact={onReact}
        onComment={onComment}
        onReport={onReport}
        onDelete={onDelete}
        onOpenPost={jest.fn()}
      />,
    );

    fireEvent.press(view.getByTestId('react-AMEM-p1'));
    expect(onReact).toHaveBeenCalledWith('AMEM');
    fireEvent.changeText(view.getByTestId('comment-input-p1'), 'Amém, irmãos.');
    fireEvent.press(view.getByTestId('comment-submit-p1'));
    expect(onComment).toHaveBeenCalledWith('Amém, irmãos.');

    fireEvent.press(view.getByTestId('delete-post-p1'));
    expect(onDelete).toHaveBeenCalledWith('p1');

    const other = render(
      <PostCard post={post({ isOwn: false })} onReport={onReport} onOpenPost={jest.fn()} />,
    );
    fireEvent.press(other.getByTestId('report-toggle-p1'));
    for (const reason of REPORT_REASONS) {
      expect(other.getByTestId(`report-reason-${reason.id}-p1`)).toBeTruthy();
    }
    fireEvent.press(other.getByTestId('report-reason-DOCTRINE-p1'));
    expect(onReport).toHaveBeenCalledWith('DOCTRINE');
    expect(REPORT_REASONS).toHaveLength(7);
    expect(publicPostUrl('paz')).toBe('https://catequis.app/c/paz');
    expect(view.getByTestId('copy-link-p1')).toBeTruthy();
    expect(view.getByTestId('whatsapp-p1')).toBeTruthy();
    expect(view.getByText('Copiar link')).toBeTruthy();
    expect(view.getByText('WhatsApp')).toBeTruthy();
  });
});
