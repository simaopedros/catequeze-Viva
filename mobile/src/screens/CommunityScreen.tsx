import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { PostCard } from '../components/PostCard';
import { BrandButton, EmptyState, LoadingState, Screen } from '../components/ui';
import type { SocialAccess, SocialPost, SocialReportReason, SocialTopic } from '../api/types';
import { communityPublishNotice, FEED_TABS, type FeedTabId } from '../lib/social';
import { colors, fonts, spacing } from '../theme';

export function CommunityScreen({
  posts,
  topics,
  access,
  tab,
  topicSlug,
  loading,
  refreshing,
  error,
  hasMore,
  showShorts = false,
  onChangeTab,
  onChangeTopic,
  onOpenAuthor,
  onOpenPost,
  onOpenTopic,
  onCompose,
  onReact,
  onComment,
  onDelete,
  onReport,
  onRefresh,
  onLoadMore,
}: {
  posts: SocialPost[];
  topics: SocialTopic[];
  access?: SocialAccess | null;
  tab: FeedTabId;
  topicSlug?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  hasMore?: boolean;
  showShorts?: boolean;
  onChangeTab: (tab: FeedTabId) => void;
  onChangeTopic: (slug: string | null) => void;
  onOpenAuthor: (handle: string) => void;
  onOpenPost?: (slug: string) => void;
  onOpenTopic?: (slug: string) => void;
  onCompose: () => void;
  onReact?: (postId: string, type: 'AMEM' | 'REZO' | 'ALELUIA') => void;
  onComment?: (postId: string, body: string) => void;
  onDelete?: (postId: string) => void;
  onReport?: (postId: string, reason: SocialReportReason) => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
}) {
  const notice = communityPublishNotice(access);
  const tabs = FEED_TABS.filter((item) => item.id !== 'shorts' || showShorts);

  return (
    <Screen
      testID="community-screen"
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={hasMore ? onLoadMore : undefined}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: colors.ink }}>Comunidade</Text>
        <BrandButton label="Publicar" onPress={onCompose} testID="compose-open" />
      </View>
      {notice ? (
        <Text testID="community-notice" style={{ color: colors.goldDark, fontFamily: fonts.sansMedium, marginBottom: spacing.md }}>
          {notice}
        </Text>
      ) : null}
      <View testID="feed-tabs" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
        {tabs.map((item) => {
          const on = tab === item.id;
          return (
            <Pressable
              key={item.id}
              testID={`feed-tab-${item.id}`}
              onPress={() => onChangeTab(item.id)}
              style={{
                minHeight: 36,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: on ? colors.ink : colors.canvas,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: on ? colors.white : colors.ink, fontFamily: fonts.sansSemi, fontSize: 13 }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        <Pressable onPress={() => onChangeTopic(null)}>
          <Text style={{ color: !topicSlug ? colors.goldDark : colors.muted, fontFamily: fonts.sansBold }}>Todos</Text>
        </Pressable>
        {topics.map((topic) => (
          <Pressable
            key={topic.slug}
            onPress={() => (onOpenTopic ? onOpenTopic(topic.slug) : onChangeTopic(topic.slug))}
            testID={`topic-${topic.slug}`}
          >
            <Text style={{ color: topicSlug === topic.slug ? colors.goldDark : colors.muted, fontFamily: fonts.sansBold }}>
              {topic.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading && posts.length === 0 ? <LoadingState /> : null}
      {error ? <EmptyState title="Feed indisponível" body={error} /> : null}
      {!loading && posts.length === 0 ? (
        <EmptyState
          title="Ainda não há publicações"
          body="Toque em Publicar para a primeira partilha."
          actionLabel="Publicar"
          onAction={onCompose}
        />
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onOpenAuthor={onOpenAuthor}
            onOpenPost={onOpenPost}
            onReact={onReact ? (type) => onReact(post.id, type) : undefined}
            onComment={onComment ? (body) => onComment(post.id, body) : undefined}
            onDelete={onDelete}
            onReport={onReport ? (reason) => onReport(post.id, reason) : undefined}
          />
        ))
      )}
      {hasMore && onLoadMore && posts.length > 0 ? (
        <BrandButton variant="ghost" label="Carregar mais" onPress={onLoadMore} testID="feed-load-more" />
      ) : null}
    </Screen>
  );
}
