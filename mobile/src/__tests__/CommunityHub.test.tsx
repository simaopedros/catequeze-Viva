import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CommunityScreen } from '../screens/CommunityScreen';
import { openCommunityArea } from '../screens/communityNavigation';
import { appRoutes } from '../navigation/routes';

describe('Community feed', () => {
  it('renderiza filtros, composer e feed no layout da Comunidade', () => {
    const onCompose = jest.fn();
    const onOpenLink = jest.fn();
    const view = render(
      <CommunityScreen
        posts={[
          {
            id: 'p1',
            slug: 'paz-e-bem',
            body: 'Paz e bem, irmãos. A catequese começou.',
            author: { id: 'u1', handle: 'coord_saojose', displayName: 'Coordenador São José', avatarUrl: null },
            parish: { id: 'parish-1', name: 'Paróquia São João' },
            createdAt: new Date().toISOString(),
          },
        ]}
        feedScope="all"
        onChangeFeedScope={jest.fn()}
        onOpenAuthor={jest.fn()}
        onOpenPost={jest.fn()}
        onCompose={onCompose}
        onOpenLink={onOpenLink}
      />,
    );

    expect(view.getByTestId('community-screen')).toBeTruthy();
    expect(view.getByTestId('community-scope-filters')).toBeTruthy();
    expect(view.getByTestId('community-compose-card')).toBeTruthy();
    expect(view.getByText('Paz e bem, irmãos. A catequese começou.')).toBeTruthy();
    expect(view.getByTestId('post-p1')).toBeTruthy();

    fireEvent.press(view.getByTestId('compose-action-text'));
    expect(onCompose).toHaveBeenCalled();
    fireEvent.press(view.getByTestId('community-link-action'));
    expect(onOpenLink).toHaveBeenCalled();
  });

  it('abre as rotas de cada área', () => {
    const pushes: string[] = [];
    const router = { push: (href: string) => pushes.push(href) };

    openCommunityArea(router, 'members');
    openCommunityArea(router, 'topics');
    openCommunityArea(router, 'shorts');
    openCommunityArea(router, 'following');
    openCommunityArea(router, 'search');
    openCommunityArea(router, 'compose');
    openCommunityArea(router, 'edit');
    openCommunityArea(router, 'blocked');
    openCommunityArea(router, 'notifications');
    openCommunityArea(router, 'me', 'coord_saojose');

    expect(pushes).toEqual([
      appRoutes.members,
      appRoutes.topics,
      appRoutes.shorts,
      appRoutes.followingFeed,
      appRoutes.search,
      appRoutes.compose,
      appRoutes.editProfile,
      appRoutes.blocked,
      appRoutes.notifications,
      appRoutes.profile('coord_saojose'),
    ]);
  });
});
