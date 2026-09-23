import { useVideoPlayer, VideoView } from 'expo-video';
import { Play } from 'lucide-react-native';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { SocialPostMedia } from '../api/types';
import {
  getDefaultApiBaseUrl,
  socialImageDisplayUri,
  socialVideoDisplayUri,
  socialVideoEmbedUri,
  socialVideoThumbnailUri,
} from '../social/socialMedia';
import { colors, radius, spacing } from '../theme';

function FeedVideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={styles.mediaFrame}
      contentFit="cover"
      nativeControls
      testID="post-media-video"
    />
  );
}

function FeedVideoEmbed({ embedUrl }: { embedUrl: string }) {
  return (
    <WebView
      source={{ uri: embedUrl }}
      style={styles.mediaFrame}
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      testID="post-media-embed"
    />
  );
}

function FeedVideoCard({
  media,
  baseUrl,
}: {
  media: SocialPostMedia;
  baseUrl: string;
}) {
  const fileUri = socialVideoDisplayUri(baseUrl, media);
  const embedUri = socialVideoEmbedUri(media);
  const thumbUri = socialVideoThumbnailUri(baseUrl, media);

  if (fileUri) {
    return <FeedVideoPlayer uri={fileUri} />;
  }

  if (embedUri) {
    return <FeedVideoEmbed embedUrl={embedUri} />;
  }

  if (thumbUri) {
    return <Image source={{ uri: thumbUri }} style={styles.mediaFrame} resizeMode="cover" />;
  }

  return (
    <View style={[styles.mediaFrame, styles.videoPlaceholder]} testID="post-media-video-pending">
      <Play size={32} color={colors.primary[800]} />
      <Text style={styles.videoPlaceholderText}>
        {media.status === 'PENDING' ? 'Vídeo a processar…' : 'Vídeo'}
      </Text>
    </View>
  );
}

export function PostMediaGallery({
  media,
  baseUrl = getDefaultApiBaseUrl(),
}: {
  media: SocialPostMedia[];
  baseUrl?: string;
}) {
  const items = media ?? [];
  if (items.length === 0) return null;

  const images = items.filter((item) => item.kind === 'IMAGE' || (!item.kind && (item.imageUrl || item.url)));
  const videos = items.filter((item) => item.kind === 'VIDEO');

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
      {images.map((item) => {
        const uri = socialImageDisplayUri(baseUrl, item);
        if (!uri) return null;
        return (
          <Image
            key={item.id}
            source={{ uri }}
            style={styles.mediaFrame}
            resizeMode="cover"
            testID={`post-media-image-${item.id}`}
          />
        );
      })}
      {videos.map((item) => (
        <View key={item.id} style={styles.mediaWrap}>
          <FeedVideoCard media={item} baseUrl={baseUrl} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mediaRow: {
    marginTop: spacing[3],
    marginHorizontal: -spacing[1],
  },
  mediaWrap: {
    marginRight: spacing[2],
  },
  mediaFrame: {
    width: 280,
    height: 160,
    borderRadius: radius.md,
    marginRight: spacing[2],
    backgroundColor: colors.skeleton,
    overflow: 'hidden',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary[50],
  },
  videoPlaceholderText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
