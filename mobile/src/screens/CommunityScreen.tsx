import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  Share,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { EmptyState, ImmersiveField, LoadingState } from '../components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SocialAccess, SocialComment, SocialPost } from '../api/types';
import { ShortVideo } from '../components/ShortVideo';
import { VideoOverlay } from '../components/VideoOverlay';
import {
  RHEMA_TABS,
  isLongVideo,
  playableVideo,
  publicPostUrl,
  resolveMediaUrl,
  type FeedTabId,
} from '../lib/social';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  posts: SocialPost[];
  access?: SocialAccess | null;
  tab: FeedTabId;
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  hasMore?: boolean;
  followingIds?: string[];
  comments?: SocialComment[];
  commentsBusy?: boolean;
  onChangeTab: (tab: FeedTabId) => void;
  onOpenAuthor: (handle: string) => void;
  onOpenPost?: (slug: string) => void;
  onCompose: () => void;
  onUpload?: () => void;
  onSearch?: () => void;
  onOpenProfile?: () => void;
  onOpenTopics?: () => void;
  onOpenMembers?: () => void;
  onReact?: (postId: string, type: 'AMEM' | 'REZO' | 'ALELUIA') => void;
  onComment?: (postId: string, body: string) => void;
  onLoadComments?: (postId: string) => void;
  onFollow?: (authorId: string) => void;
  onWatch?: (postId: string) => void;
  onOpenLong?: (post: SocialPost) => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
};

function videoUri(post: SocialPost) {
  const video = playableVideo(post);
  return resolveMediaUrl(video?.videoUrl || video?.embedUrl || null);
}

export function CommunityScreen({
  posts,
  tab,
  loading,
  error,
  hasMore,
  followingIds = [],
  comments = [],
  commentsBusy,
  onChangeTab,
  onOpenAuthor,
  onCompose,
  onUpload,
  onSearch,
  onOpenProfile,
  onReact,
  onComment,
  onLoadComments,
  onFollow,
  onWatch,
  onOpenLong,
  onLoadMore,
}: Props) {
  const insets = useSafeAreaInsets();
  const pageHeight = Dimensions.get('window').height;
  const [activeId, setActiveId] = useState<string | null>(posts[0]?.id ?? null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [drawerPostId, setDrawerPostId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const startedAt = useRef<Record<string, number>>({});
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeId && posts[0]) setActiveId(posts[0].id);
  }, [posts, activeId]);

  useEffect(() => {
    const previous = activeIdRef.current;
    if (previous && previous !== activeId) {
      onWatch?.(previous);
    }
    if (activeId) {
      activeIdRef.current = activeId;
      startedAt.current[activeId] = Date.now();
      const post = posts.find((item) => item.id === activeId);
      if (post && isLongVideo(post)) onOpenLong?.(post);
    }
  }, [activeId]);

  const postsRef = useRef(posts);
  postsRef.current = posts;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const next = viewableItems.find((item) => item.isViewable)?.item as SocialPost | undefined;
    if (next?.id && next.id !== activeIdRef.current) {
      setActiveId(next.id);
      const index = postsRef.current.findIndex((item) => item.id === next.id);
      if (index >= 0) setActiveIndex(index);
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  return (
    <View testID="community-screen" style={{ flex: 1, backgroundColor: colors.immersive }}>
      <FlatList
        testID="rhema-feed"
        data={posts}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={pageHeight}
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        onEndReached={hasMore ? onLoadMore : undefined}
        onEndReachedThreshold={0.6}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
        ListEmptyComponent={
          <View style={{ height: pageHeight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            {loading ? (
              <LoadingState immersive />
            ) : (
              <EmptyState
                immersive
                title="Grava o primeiro testemunho"
                body={error || 'Um vídeo curto para a Comunidade.'}
                actionLabel="Gravar"
                onAction={onUpload || onCompose}
                actionTestID="empty-record-cta"
              />
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const uri = videoUri(item);
          const poster = resolveMediaUrl(playableVideo(item)?.thumbnailUrl || null);
          const shouldLoad = Math.abs(index - activeIndex) <= 1;
          const active = item.id === activeId;
          return (
            <View style={{ height: pageHeight, width: '100%', backgroundColor: colors.immersive, overflow: 'hidden' }} testID={`rhema-page-${item.id}`}>
              <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
                {shouldLoad && uri ? (
                  <ShortVideo uri={uri} active={active} poster={poster} />
                ) : poster ? (
                  <View style={{ flex: 1, backgroundColor: colors.immersive }} />
                ) : (
                  <View style={{ flex: 1, backgroundColor: colors.immersiveElevated }} />
                )}
              </View>
              <VideoOverlay
                post={item}
                following={followingIds.includes(item.author.id)}
                onOpenAuthor={onOpenAuthor}
                onReact={(type) => onReact?.(item.id, type)}
                onComments={() => {
                  setDrawerPostId(item.id);
                  onLoadComments?.(item.id);
                }}
                onShare={() => {
                  void Share.share({ message: publicPostUrl(item.slug), url: publicPostUrl(item.slug) });
                }}
                onFollow={item.isOwn ? undefined : () => onFollow?.(item.author.id)}
              />
            </View>
          );
        }}
      />

      <View
        style={{
          position: 'absolute',
          top: insets.top + 4,
          left: 8,
          right: 8,
          flexDirection: 'row',
          alignItems: 'center',
          pointerEvents: 'box-none',
        }}
      >
        <Pressable
          testID="community-search"
          onPress={onSearch}
          style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="search-outline" size={22} color={colors.white} />
        </Pressable>
        <View testID="feed-tabs" style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          {RHEMA_TABS.map((item) => {
            const on = tab === item.id;
            return (
              <Pressable key={item.id} testID={`feed-tab-${item.id}`} onPress={() => onChangeTab(item.id)}>
                <Text
                  style={{
                    color: on ? colors.gold : colors.onInkMuted,
                    fontFamily: fonts.sansSemi,
                    fontSize: 16,
                    paddingBottom: 4,
                    borderBottomWidth: on ? 2 : 0,
                    borderBottomColor: colors.gold,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            testID="compose-text"
            onPress={onCompose}
            accessibilityLabel="Publicação"
            style={{ alignItems: 'center', marginRight: 2, paddingHorizontal: 4 }}
          >
            <Ionicons name="create-outline" size={20} color={colors.gold} />
            <Text style={{ color: colors.gold, fontFamily: fonts.sansSemi, fontSize: 9 }}>Publicação</Text>
          </Pressable>
          <Pressable
            testID="compose-open"
            onPress={onUpload || onCompose}
            accessibilityLabel="Carregar vídeo"
            style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add" size={28} color={colors.gold} />
          </Pressable>
          <Pressable
            testID="community-profile"
            onPress={onOpenProfile}
            style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.white} />
          </Pressable>
        </View>
      </View>

      <Modal visible={Boolean(drawerPostId)} animationType="slide" transparent onRequestClose={() => setDrawerPostId(null)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.immersiveScrim }} onPress={() => setDrawerPostId(null)} />
        <View
          testID="comments-drawer"
          style={{
            backgroundColor: colors.immersiveElevated,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: 24 + insets.bottom,
            maxHeight: '55%',
          }}
        >
          <Text style={{ color: colors.white, fontFamily: fonts.sansBold, fontSize: 16, marginBottom: 12 }}>Comentários</Text>
          {commentsBusy ? <ActivityIndicator color={colors.gold} /> : null}
          {comments.map((item) => (
            <Text key={item.id} style={{ color: colors.onInk, marginBottom: 8 }}>
              {item.author.displayName}: {item.body}
            </Text>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <ImmersiveField
              testID="comment-input"
              value={draft}
              onChangeText={setDraft}
              placeholder="Escreva um comentário"
              style={{ flex: 1 }}
            />
            <Pressable
              testID="comment-send"
              onPress={() => {
                if (!drawerPostId || !draft.trim()) return;
                onComment?.(drawerPostId, draft.trim());
                setDraft('');
              }}
              style={{
                backgroundColor: colors.gold,
                borderRadius: radii.sm,
                paddingHorizontal: 14,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.ink, fontFamily: fonts.sansBold }}>Enviar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
