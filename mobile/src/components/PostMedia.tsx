import React from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveMediaUrl } from '../api/mediaUrl';
import { colors, spacing } from '../theme';

type MediaItem = {
  id: string;
  kind?: string;
  url?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  altText?: string | null;
};

function VideoAttachment({ item }: { item: MediaItem }) {
  const videoUri = resolveMediaUrl(item.videoUrl || item.url);
  const thumbUri = resolveMediaUrl(item.thumbnailUrl);
  const embedUri = item.embedUrl || null;

  if (Platform.OS !== 'web' && videoUri) {
    // Lazy require: expo-video is native-only and must not load in jest/web bundles.
    const NativeVideo = require('./NativeVideo').default;
    return <NativeVideo uri={videoUri} />;
  }

  const target = embedUri || videoUri;
  return (
    <Pressable
      testID={`video-${item.id}`}
      onPress={() => target && Linking.openURL(target)}
      disabled={!target}
      style={styles.videoFallback}
    >
      {thumbUri ? <Image source={{ uri: thumbUri }} style={styles.image} /> : null}
      <View style={styles.playBadge}>
        <Text style={styles.playBadgeText}>▶ Ver vídeo</Text>
      </View>
    </Pressable>
  );
}

export function PostMedia({ media }: { media?: MediaItem[] | null }) {
  if (!media || media.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {media.map((item) => {
        if (item.kind === 'VIDEO') {
          return <VideoAttachment key={item.id} item={item} />;
        }
        const uri = resolveMediaUrl(item.imageUrl || item.url || item.thumbnailUrl);
        if (!uri) return null;
        return (
          <Image
            key={item.id}
            testID={`image-${item.id}`}
            source={{ uri }}
            style={styles.image}
            accessibilityLabel={item.altText || 'Imagem da publicação'}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm, gap: spacing.sm },
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: colors.line },
  videoFallback: { borderRadius: 12, overflow: 'hidden', backgroundColor: colors.ink },
  playBadge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  playBadgeText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
