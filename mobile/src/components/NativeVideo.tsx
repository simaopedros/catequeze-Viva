import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

export default function NativeVideo({ uri, style }: { uri: string; style?: ViewStyle }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });
  return (
    <View style={[styles.wrap, style]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
});
