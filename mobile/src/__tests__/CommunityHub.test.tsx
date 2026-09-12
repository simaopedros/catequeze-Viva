import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CommunityScreen } from '../screens/CommunityScreen';
import { COMMUNITY_AREAS } from '../screens/communityAreas';
import { openCommunityArea } from '../screens/communityNavigation';
import { appRoutes } from '../navigation/routes';
import { communityPublishNotice, FEED_TABS } from '../lib/social';

const base = {
  posts: [] as React.ComponentProps<typeof CommunityScreen>['posts'],
  topics: [] as React.ComponentProps<typeof CommunityScreen>['topics'],
  tab: 'recent' as const,
  onChangeTab: jest.fn(),
  onChangeTopic: jest.fn(),
  onOpenAuthor: jest.fn(),
  onCompose: jest.fn(),
};

describe('Community hub', () => {
  it('usa os avisos de quota e assinatura do site', () => {
    expect(communityPublishNotice({ authenticated: true, canPublish: true })).toBeNull();
    expect(communityPublishNotice({ authenticated: true, canPublish: false, reason: 'subscription' })).toBe(
      'Assine para publicar. Ler e compartilhar a Comunidade é livre.',
    );
    expect(communityPublishNotice({ authenticated: true, canPublish: false, reason: 'quota' })).toBe(
      'Você já publicou tudo o que o seu plano permite hoje. Tente novamente amanhã.',
    );
    expect(communityPublishNotice({ authenticated: true, canPublish: false, banned: true })).toBe(
      'Conta suspensa na Comunidade. Fale com o suporte para rever a suspensão.',
    );
    expect(communityPublishNotice({ authenticated: true, canPublish: true, quotaLeft: 1 })).toBe(
      '1 publicação restante hoje',
    );

    const allowed = render(
      <CommunityScreen {...base} access={{ authenticated: true, canPublish: true }} />,
    );
    expect(allowed.queryByTestId('community-notice')).toBeNull();
    expect(allowed.queryByText(/Publicar pede assinatura/)).toBeNull();

    const gated = render(
      <CommunityScreen
        {...base}
        access={{ authenticated: true, canPublish: false, reason: 'subscription' }}
      />,
    );
    expect(gated.getByText(/Assine para publicar/)).toBeTruthy();
  });

  it('mostra as abas da Comunidade e esconde Shorts sem vídeo', () => {
    const onChangeTab = jest.fn();
    const view = render(
      <CommunityScreen
        {...base}
        topics={[{ slug: 'oracao', name: 'Oração' }]}
        onChangeTab={onChangeTab}
      />,
    );

    expect(view.getByText('Ainda não há publicações')).toBeTruthy();
    expect(view.getByText(/Toque em Publicar/)).toBeTruthy();
    expect(view.getByTestId('feed-tab-foryou')).toBeTruthy();
    expect(view.getByTestId('feed-tab-recent')).toBeTruthy();
    expect(view.getByTestId('feed-tab-trending')).toBeTruthy();
    expect(view.getByTestId('feed-tab-following')).toBeTruthy();
    expect(view.queryByTestId('feed-tab-shorts')).toBeNull();
    expect(FEED_TABS.map((tab) => tab.label)).toEqual([
      'Para você',
      'Shorts',
      'Recentes',
      'Em alta',
      'A seguir',
    ]);
    for (const area of COMMUNITY_AREAS.filter((item) => item.id !== 'feed')) {
      expect(view.queryByTestId(`area-${area.id}`)).toBeNull();
    }

    fireEvent.press(view.getByTestId('feed-tab-trending'));
    expect(onChangeTab).toHaveBeenCalledWith('trending');

    const withShorts = render(<CommunityScreen {...base} showShorts />);
    expect(withShorts.getByTestId('feed-tab-shorts')).toBeTruthy();
  });

  it('mostra as postagens no próprio feed', () => {
    const view = render(
      <CommunityScreen
        {...base}
        posts={[
          {
            id: 'p1',
            slug: 'paz-e-bem',
            body: 'Paz e bem, irmãos. A catequese começou.',
            author: { id: 'u1', handle: 'coord_saojose', displayName: 'Coordenador São José', avatarUrl: null },
          },
        ]}
        onOpenPost={jest.fn()}
      />,
    );

    expect(view.getByText('Paz e bem, irmãos. A catequese começou.')).toBeTruthy();
    expect(view.getByTestId('post-p1')).toBeTruthy();
    expect(view.getByTestId('open-post-p1')).toBeTruthy();
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
