import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CommunityScreen } from '../screens/CommunityScreen';
import { COMMUNITY_AREAS } from '../screens/communityAreas';
import { openCommunityArea } from '../screens/communityNavigation';
import { appRoutes } from '../navigation/routes';

describe('Community hub', () => {
  it('mostra todas as áreas da rede social', () => {
    const onOpenArea = jest.fn();
    const view = render(
      <CommunityScreen
        posts={[]}
        topics={[{ slug: 'oracao', name: 'Oração' }]}
        sort="recent"
        showHub
        onOpenArea={onOpenArea}
        onChangeSort={jest.fn()}
        onChangeTopic={jest.fn()}
        onOpenAuthor={jest.fn()}
        onCompose={jest.fn()}
        onSearch={jest.fn()}
      />,
    );

    expect(view.getByTestId('community-hub')).toBeTruthy();
    expect(view.getByTestId('feed-heading')).toBeTruthy();
    expect(view.getByText('Publicações')).toBeTruthy();
    for (const area of COMMUNITY_AREAS.filter((item) => item.id !== 'feed')) {
      expect(view.getByTestId(`area-${area.id}`)).toBeTruthy();
      expect(view.getByText(area.label)).toBeTruthy();
    }
    expect(view.queryByTestId('area-feed')).toBeNull();

    fireEvent.press(view.getByTestId('area-members'));
    expect(onOpenArea).toHaveBeenCalledWith('members');
  });

  it('mostra as postagens no próprio feed, sem escondê-las atrás das áreas', () => {
    const view = render(
      <CommunityScreen
        posts={[
          {
            id: 'p1',
            slug: 'paz-e-bem',
            body: 'Paz e bem, irmãos. A catequese começou.',
            author: { id: 'u1', handle: 'coord_saojose', displayName: 'Coordenador São José', avatarUrl: null },
          },
        ]}
        topics={[]}
        sort="recent"
        showHub
        onOpenArea={jest.fn()}
        onChangeSort={jest.fn()}
        onChangeTopic={jest.fn()}
        onOpenAuthor={jest.fn()}
        onOpenPost={jest.fn()}
        onCompose={jest.fn()}
      />,
    );

    expect(view.getByText('Paz e bem, irmãos. A catequese começou.')).toBeTruthy();
    expect(view.getByTestId('post-p1')).toBeTruthy();
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
