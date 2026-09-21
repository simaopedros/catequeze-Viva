import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { colors, type } from '../theme';

const HEIGHT = Dimensions.get('window').height * 0.78;

type ShortMedia = {
  kind?: string;
  status?: string;
  videoUrl?: string | null;
  embedUrl?: string | null;
};

export type ShortPost = {
  id: string;
  slug: string;
  body?: string;
  author?: { handle?: string | null; displayName?: string };
  media?: ShortMedia[];
};

function playable(post: ShortPost) {
  const media = (post.media || []).find((item) => item.videoUrl || item.embedUrl);
  return media || null;
}

function DirectVideo({ url, active }: { url: string; active: boolean }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = true;
  });
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);
  return <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls={false} />;
}

export function ShortsScreen({
  posts,
  loading,
  error,
  onOpenAuthor,
  onReact,
}: {
  posts: ShortPost[];
  loading?: boolean;
  error?: string | null;
  onOpenAuthor: (handle: string) => void;
  onReact?: (postId: string) => void;
}) {
  const [activeId, setActiveId] = useState(posts[0]?.id);

  if (loading && posts.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink }}>
        <LoadingState label="Carregando shorts…" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }} testID="shorts-screen">
      {error ? <ErrorState title="Shorts indisponíveis" body={error} /> : null}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={({ viewableItems }) => {
          const next = viewableItems[0]?.item?.id;
          if (next) setActiveId(next);
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
        ListEmptyComponent={
          <EmptyState title="Sem vídeos curtos" body="Quando a Comunidade publicar um short, ele aparece aqui." />
        }
        renderItem={({ item }) => {
          const media = playable(item);
          const active = item.id === activeId;
          return (
            <View style={{ height: HEIGHT, backgroundColor: '#000' }} testID={`short-${item.id}`}>
              {media?.videoUrl ? <DirectVideo url={media.videoUrl} active={active} /> : null}
              {!media?.videoUrl && media?.embedUrl ? (
                <WebView source={{ uri: media.embedUrl }} style={{ flex: 1, backgroundColor: '#000' }} />
              ) : null}
              {!media?.videoUrl && !media?.embedUrl ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                  <Text style={{ color: colors.cream, fontFamily: type.body, textAlign: 'center' }}>
                    Este vídeo ainda não está pronto.
                  </Text>
                </View>
              ) : null}
              <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24 }}>
                {item.author?.handle ? (
                  <Pressable onPress={() => onOpenAuthor(item.author!.handle!)}>
                    <Text style={{ color: colors.white, fontFamily: type.bodyBold }}>@{item.author.handle}</Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: colors.white, fontFamily: type.bodyBold }}>{item.author?.displayName}</Text>
                )}
                {item.body ? (
                  <Text style={{ color: colors.cream, fontFamily: type.body, marginTop: 6 }} numberOfLines={3}>
                    {item.body}
                  </Text>
                ) : null}
                {onReact ? (
                  <Pressable onPress={() => onReact(item.id)} style={{ marginTop: 10 }}>
                    <Text style={{ color: colors.goldLight, fontFamily: type.bodyBold }}>Amém</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
