import React, { createElement, useEffect } from 'react';
import { Image, Platform, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  uri: string;
  active: boolean;
  cover?: boolean;
  poster?: string | null;
  testID?: string;
};

function WebVideo({ uri, active, cover, testID }: Props) {
  const ref = React.useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) void el.play().catch(() => undefined);
    else el.pause();
  }, [active, uri]);
  return createElement('video', {
    ref,
    src: uri,
    muted: true,
    loop: true,
    playsInline: true,
    autoPlay: active,
    'data-testid': testID || 'short-video',
    style: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      objectFit: cover === false ? 'contain' : 'cover',
      backgroundColor: '#000',
    },
  });
}

function NativeVideo({ uri, active, cover, testID }: Props) {
  const video = require('expo-video') as typeof import('expo-video');
  const player = video.useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);
  return (
    <video.VideoView
      player={player}
      nativeControls={false}
      contentFit={cover === false ? 'contain' : 'cover'}
      style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#000' }}
      testID={testID || 'short-video'}
    />
  );
}

export function ShortVideo(props: Props) {
  if (!props.uri) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.rhemaBlack }} testID={props.testID || 'short-video'}>
        {props.poster ? (
          <Image source={{ uri: props.poster }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : null}
      </View>
    );
  }
  if (Platform.OS === 'web') return <WebVideo {...props} />;
  try {
    require('expo-video');
    return <NativeVideo {...props} />;
  } catch {
    return (
      <View style={{ flex: 1, backgroundColor: colors.rhemaBlack }} testID={props.testID || 'short-video'}>
        {props.poster ? (
          <Image source={{ uri: props.poster }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : null}
      </View>
    );
  }
}
