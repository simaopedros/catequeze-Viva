import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostDetailScreen } from '../screens/PostDetailScreen';

jest.mock('expo-router', () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

const post = {
  id: 'p1',
  slug: 'paz',
  body: 'Paz e bem a todos.',
  author: { id: 'u1', displayName: 'João', handle: 'joao', avatarUrl: null },
  reactionCount: 2,
  commentCount: 1,
  viewerReaction: 'AMEM' as const,
  topics: [{ name: 'Partilha', slug: 'partilha' }],
};

describe('PostDetailScreen', () => {
  it('focuses on post content with a single pastoral reaction strip', () => {
    const onReact = jest.fn();
    const view = render(
      <PostDetailScreen
        post={post}
        comments={[]}
        onOpenAuthor={jest.fn()}
        onReact={onReact}
        onComment={jest.fn()}
        onReport={jest.fn()}
      />,
    );

    expect(view.getByTestId('post-screen')).toBeTruthy();
    expect(view.getByText('Paz e bem a todos.')).toBeTruthy();
    expect(view.getByTestId('post-reaction-strip')).toBeTruthy();
    expect(view.queryByTestId('open-post-p1')).toBeNull();
    expect(view.queryByText('Publicação')).toBeNull();

    fireEvent.press(view.getByTestId('react-REZO'));
    expect(onReact).toHaveBeenCalledWith('REZO');
  });
});
