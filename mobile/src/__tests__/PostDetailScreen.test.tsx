import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { PostDetailScreen } from '../screens/PostDetailScreen';

describe('PostDetailScreen', () => {
  it('responde com parentId e mostra comentário em revisão', async () => {
    const onComment = jest.fn(async () => undefined);
    const view = render(
      <PostDetailScreen
        post={{
          id: 'p1',
          slug: 'paz',
          body: 'Paz e bem',
          author: { id: 'u1', handle: 'ana', displayName: 'Ana Silva', avatarUrl: null },
        }}
        comments={[
          {
            id: 'c1',
            body: 'Amém.',
            author: { id: 'u2', handle: 'joao', displayName: 'João', avatarUrl: null },
          },
        ]}
        access={{ authenticated: true, canPublish: true }}
        heldMessage="O seu comentário foi enviado para revisão."
        onOpenAuthor={jest.fn()}
        onReact={jest.fn()}
        onComment={onComment}
      />,
    );

    expect(view.getByTestId('comment-held')).toBeTruthy();
    fireEvent.press(view.getByTestId('reply-c1'));
    expect(view.getByTestId('replying-to')).toBeTruthy();
    fireEvent.changeText(view.getByTestId('comment-input'), 'Também rezo.');
    await act(async () => {
      fireEvent.press(view.getByTestId('comment-submit'));
    });
    expect(onComment).toHaveBeenCalledWith('Também rezo.', 'c1');
  });
});
