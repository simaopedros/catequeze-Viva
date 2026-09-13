import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { PostCard } from '../components/PostCard';
import { BrandButton, EmptyState, LoadingState, Screen } from '../components/ui';
import type { SocialAccess, SocialPost, SocialReportReason } from '../api/types';
import { communityPublishNotice, FEED_TABS, type FeedTabId } from '../lib/social';
import { colors, fonts, spacing } from '../theme';

const CIRCLE_TABS = FEED_TABS.filter((item) => item.id !== 'shorts');

export function CommunityScreen({
  posts,
  access,
  tab,
  loading,
  refreshing,
  error,
  hasMore,
  onChangeTab,
  onOpenAuthor,
  onOpenPost,
  onCompose,
  onSearch,
  onOpenTopics,
  onOpenMembers,
  onReact,
  onComment,
  onDelete,
  onReport,
  onRefresh,
  onLoadMore,
}: {
  posts: SocialPost[];
  access?: SocialAccess | null;
  tab: FeedTabId;
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  hasMore?: boolean;
  onChangeTab: (tab: FeedTabId) => void;
  onOpenAuthor: (handle: string) => void;
  onOpenPost?: (slug: string) => void;
  onCompose: () => void;
  onSearch?: () => void;
  onOpenTopics?: () => void;
  onOpenMembers?: () => void;
  onReact?: (postId: string, type: 'AMEM' | 'REZO' | 'ALELUIA') => void;
  onComment?: (postId: string, body: string) => void;
  onDelete?: (postId: string) => void;
  onReport?: (postId: string, reason: SocialReportReason) => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
}) {
  const notice = communityPublishNotice(access);

  return (
    <View style={{ flex: 1 }}>
      <Screen
        testID="community-screen"
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={hasMore ? onLoadMore : undefined}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: colors.ink }}>Comunidade</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pesquisar"
            testID="community-search"
            onPress={onSearch}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.canvas,
            }}
          >
            <Ionicons name="search-outline" size={22} color={colors.ink} />
          </Pressable>
        </View>
        {notice ? (
          <Text
            testID="community-notice"
            style={{ color: colors.goldDark, fontFamily: fonts.sansMedium, marginBottom: spacing.md }}
          >
            {notice}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: spacing.md }}>
          <Pressable testID="community-espacos" onPress={onOpenTopics}>
            <Text style={{ color: colors.goldDark, fontFamily: fonts.sansBold }}>Espaços</Text>
          </Pressable>
          <Pressable testID="community-members" onPress={onOpenMembers}>
            <Text style={{ color: colors.goldDark, fontFamily: fonts.sansBold }}>Membros</Text>
          </Pressable>
        </View>
        <View testID="feed-tabs" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
          {CIRCLE_TABS.map((item) => {
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
                <Text style={{ color: on ? colors.white : colors.ink, fontFamily: fonts.sansSemi, fontSize: 13 }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Publicar"
        testID="compose-open"
        onPress={onCompose}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.gold,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 4,
        }}
      >
        <Ionicons name="create-outline" size={26} color={colors.ink} />
      </Pressable>
    </View>
  );
}
