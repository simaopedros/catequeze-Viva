import React, { useEffect } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { ShortVideo } from '../components/ShortVideo';
import { colors, fonts } from '../theme';

export function LongVideoPlayerScreen({
  uri,
  title,
  onBack,
}: {
  uri: string;
  title?: string;
  onBack?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  useEffect(() => {
    // Horizontal player: contain, no loop — duration is already >180s or LONG.
  }, [uri]);

  return (
    <View testID="long-player" style={{ flex: 1, backgroundColor: colors.rhemaBlack, justifyContent: 'center' }}>
      <View style={{ width: '100%', height: landscape ? '100%' : width * (9 / 16), backgroundColor: '#000' }}>
        <ShortVideo uri={uri} active cover={false} testID="long-video" />
      </View>
      {title ? (
        <Text style={{ color: '#fff', fontFamily: fonts.sansSemi, padding: 16 }} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
      {onBack ? (
        <Pressable testID="long-player-back" onPress={onBack} style={{ position: 'absolute', top: 48, left: 16 }}>
          <Text style={{ color: colors.rhemaGold, fontFamily: fonts.sansBold }}>Fechar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
