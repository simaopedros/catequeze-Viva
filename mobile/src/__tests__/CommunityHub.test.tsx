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
    for (const area of COMMUNITY_AREAS) {
      expect(view.getByTestId(`area-${area.id}`)).toBeTruthy();
      expect(view.getByText(area.label)).toBeTruthy();
    }

    fireEvent.press(view.getByTestId('area-members'));
    expect(onOpenArea).toHaveBeenCalledWith('members');
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
