import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CommunityScreen } from '../screens/CommunityScreen';
import { VideoUploadScreen } from '../screens/VideoUploadScreen';
import { isLongVideo, playableVideo, RHEMA_TABS, feedQueryForTab } from '../lib/social';
import { openCommunityArea } from '../screens/communityNavigation';
import { appRoutes } from '../navigation/routes';
import type { SocialPost } from '../api/types';

const shortPost: SocialPost = {
  id: 'p1',
  slug: 'testemunho-crisma',
  body: 'A Crisma mudou a minha vida.',
  videoFormat: 'SHORT',
  viewerReaction: null,
  commentCount: 2,
  author: { id: 'u1', handle: 'coord_saojose', displayName: 'Coordenador São José', avatarUrl: null },
  media: [
    {
      id: 'm1',
      kind: 'VIDEO',
      videoUrl: '/api/social/media/m1',
      durationSeconds: 12,
    },
  ],
};

const base = {
  posts: [] as SocialPost[],
  tab: 'foryou' as const,
  onChangeTab: jest.fn(),
  onOpenAuthor: jest.fn(),
  onCompose: jest.fn(),
  onUpload: jest.fn(),
};

describe('Rhema community feed', () => {
  it('mostra Seguindo e Para você, e o + abre o upload', () => {
    const onUpload = jest.fn();
    const onCompose = jest.fn();
    const onChangeTab = jest.fn();
    const view = render(
      <CommunityScreen {...base} onChangeTab={onChangeTab} onUpload={onUpload} onCompose={onCompose} />,
    );

    expect(view.getByText('Grava o primeiro testemunho')).toBeTruthy();
    expect(view.getByTestId('empty-record-cta')).toBeTruthy();
    expect(view.getByTestId('community-search')).toBeTruthy();
    expect(view.getByTestId('community-profile')).toBeTruthy();
    expect(view.getByTestId('feed-tab-following')).toBeTruthy();
    expect(view.getByTestId('feed-tab-foryou')).toBeTruthy();
    expect(view.queryByTestId('feed-tab-recent')).toBeNull();
    expect(view.queryByTestId('feed-tab-shorts')).toBeNull();
    expect(RHEMA_TABS.map((tab) => tab.label)).toEqual(['Seguindo', 'Para você']);
    expect(feedQueryForTab('following')).toEqual({ sort: 'recent', following: true, videoFormat: 'SHORT' });
    expect(feedQueryForTab('foryou')).toEqual({ sort: 'foryou', following: false, videoFormat: 'SHORT' });

    fireEvent.press(view.getByTestId('compose-open'));
    expect(onUpload).toHaveBeenCalled();
    expect(onCompose).not.toHaveBeenCalled();
    fireEvent.press(view.getByTestId('compose-text'));
    expect(onCompose).toHaveBeenCalled();
    fireEvent.press(view.getByTestId('feed-tab-following'));
    expect(onChangeTab).toHaveBeenCalledWith('following');
  });

  it('mostra overlay Amém/Rezo/Aleluia, comentários, partilhar e seguir', () => {
    const onReact = jest.fn();
    const onFollow = jest.fn();
    const onLoadComments = jest.fn();
    const view = render(
      <CommunityScreen
        {...base}
        posts={[shortPost]}
        onReact={onReact}
        onFollow={onFollow}
        onLoadComments={onLoadComments}
      />,
    );

    expect(view.getByTestId('rhema-feed')).toBeTruthy();
    expect(view.getByTestId('overlay-amem')).toBeTruthy();
    expect(view.getByTestId('overlay-rezo')).toBeTruthy();
    expect(view.getByTestId('overlay-aleluia')).toBeTruthy();
    fireEvent.press(view.getByTestId('overlay-amem'));
    expect(onReact).toHaveBeenCalledWith('p1', 'AMEM');
    fireEvent.press(view.getByTestId('overlay-follow'));
    expect(onFollow).toHaveBeenCalledWith('u1');
    fireEvent.press(view.getByTestId('overlay-comments'));
    expect(onLoadComments).toHaveBeenCalledWith('p1');
    expect(view.getByTestId('comments-drawer')).toBeTruthy();
  });

  it('trata vídeo LONG ou >180s como player longo', () => {
    expect(isLongVideo({ videoFormat: 'LONG' })).toBe(true);
    expect(isLongVideo({ videoFormat: 'SHORT', media: [{ kind: 'VIDEO', durationSeconds: 12 }] })).toBe(false);
    expect(isLongVideo({ media: [{ kind: 'VIDEO', durationSeconds: 181 }] })).toBe(true);
    expect(playableVideo(shortPost)?.videoUrl).toBe('/api/social/media/m1');
  });

  it('abre upload e watch nas rotas da Comunidade', () => {
    const pushes: string[] = [];
    const router = { push: (href: string) => pushes.push(href) };
    openCommunityArea(router, 'compose');
    expect(pushes).toContain(appRoutes.compose);
    expect(appRoutes.upload).toBe('/(app)/community/upload');
    expect(appRoutes.watch('paz')).toBe('/(app)/community/watch/paz');
  });
});

describe('Video upload', () => {
  it('pede câmara, galeria e progresso', () => {
    const onPickCamera = jest.fn();
    const onPickGallery = jest.fn();
    const onPublish = jest.fn();
    const view = render(
      <VideoUploadScreen
        canPublish
        progress={0.4}
        onPickCamera={onPickCamera}
        onPickGallery={onPickGallery}
        onPublish={onPublish}
      />,
    );
    fireEvent.press(view.getByTestId('upload-camera'));
    fireEvent.press(view.getByTestId('upload-gallery'));
    expect(onPickCamera).toHaveBeenCalled();
    expect(onPickGallery).toHaveBeenCalled();
    expect(view.getByTestId('upload-progress')).toBeTruthy();
    fireEvent.press(view.getByTestId('upload-consent'));
    fireEvent.press(view.getByTestId('upload-publish'));
    expect(onPublish).toHaveBeenCalled();
  });
});
