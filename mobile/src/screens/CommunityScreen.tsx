import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { PostCard } from '../components/PostCard';
import { BrandButton, Card, EmptyState, Icon, PrimaryFab, Screen, ScreenTitle, SkeletonList, type IconName } from '../components/ui';

import type { SocialAccess, SocialPost, SocialTopic } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { COMMUNITY_AREAS, type CommunityAreaId } from './communityAreas';

const SORTS = [
  { id: 'recent', label: 'Recentes', icon: 'clock-outline' },
  { id: 'trending', label: 'Em alta', icon: 'fire' },
  { id: 'foryou', label: 'Para si', icon: 'star-outline' },
] as const;

const AREA_ICONS: Record<CommunityAreaId, IconName> = {
  feed: 'view-dashboard-outline',
  following: 'account-heart-outline',
  shorts: 'play-box-outline',
  search: 'magnify',
  compose: 'pencil-plus-outline',
  topics: 'pound',
  members: 'account-group-outline',
  me: 'account-circle-outline',
  edit: 'account-edit-outline',
  blocked: 'account-cancel-outline',
  notifications: 'bell-outline',
};

function AreaTile({ id, label, hint, onPress }: { id: CommunityAreaId; label: string; hint: string; onPress: () => void }) {
  return (
    <Pressable
      testID={`area-${id}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 104,
        padding: spacing.sm,
        borderRadius: radius.lg,
        backgroundColor: pressed ? colors.paper : colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        gap: 6,
      })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8E7BF', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={AREA_ICONS[id]} size={18} color={colors.goldDark} />
      </View>
      <Text variant="labelLarge" style={{ color: colors.ink }} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.muted }} numberOfLines={2}>
        {hint}
      </Text>
    </Pressable>
  );
}

export function CommunityScreen({
  title = 'Comunidade',
  subtitle = 'Ler e seguir é livre. Publicar pede assinatura.',
  posts,
  topics,
  access,
  sort,
  topicSlug,
  loading,
  error,
  onChangeSort,
  onChangeTopic,
  onOpenAuthor,
  onOpenPost,
  onOpenTopic,
  onCompose,
  onSearch,
  following,
  onToggleFollowing,
  showHub,
  onOpenArea,
  refreshing,
  onRefresh,
  hasMore,
  loadingMore,
  onLoadMore,
  onSharePost,
  onDeletePost,
}: {
  posts: SocialPost[];
  topics: SocialTopic[];
  access?: SocialAccess | null;
  sort: 'recent' | 'trending' | 'foryou';
  topicSlug?: string | null;
  loading?: boolean;
  error?: string | null;
  onChangeSort: (sort: 'recent' | 'trending' | 'foryou') => void;
  onChangeTopic: (slug: string | null) => void;
  onOpenAuthor: (handle: string) => void;
  onOpenPost?: (slug: string) => void;
  onOpenTopic?: (slug: string) => void;
  onCompose: () => void;
  onSearch?: () => void;
  following?: boolean;
  onToggleFollowing?: () => void;
  title?: string;
  subtitle?: string;
  showHub?: boolean;
  onOpenArea?: (id: CommunityAreaId) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onSharePost?: (post: SocialPost) => void;
  onDeletePost?: (post: SocialPost) => void;
}) {
  const canPublish = !access || access.canPublish;
  return (
    <Screen
      testID="community-screen"
      safeTop={Boolean(showHub)}
      safeBottom={Boolean(showHub)}
      fabInset={canPublish}
      refreshing={refreshing}
      onRefresh={onRefresh}
      fab={canPublish ? <PrimaryFab icon="pencil-plus-outline" label="Nova publicação" onPress={onCompose} testID="compose-open" /> : undefined}
    >
      <ScreenTitle
        title={title}
        subtitle={subtitle}
        action={
          onSearch ? (
            <Pressable testID="open-search" accessibilityRole="button" onPress={onSearch} style={{ padding: 6 }}>
              <Icon name="magnify" size={26} color={colors.ink} />
            </Pressable>
          ) : undefined
        }
      />

      {showHub && onOpenArea ? (
        <View testID="community-hub" style={{ marginHorizontal: -spacing.md, marginBottom: spacing.sm }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.sm }}>
            {COMMUNITY_AREAS.filter((area) => area.id !== 'feed').map((area) => (
              <AreaTile key={area.id} id={area.id} label={area.label} hint={area.hint} onPress={() => onOpenArea(area.id)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {access && !access.canPublish ? (
        <Card tone="gold">
          <Text variant="bodyMedium" style={{ color: colors.goldDark }}>
            {access.reason === 'subscription'
              ? 'Pode ler e seguir. Para publicar, precisa de uma assinatura ativa.'
              : 'A publicação está limitada nesta conta.'}
          </Text>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
        {SORTS.map((item) => {
          const active = sort === item.id;
          return (
            <Chip
              key={item.id}
              testID={`sort-${item.id}`}
              selected={active}
              showSelectedCheck={false}
              icon={item.icon}
              mode={active ? 'flat' : 'outlined'}
              onPress={() => onChangeSort(item.id)}
              style={{ backgroundColor: active ? colors.ink : colors.surface, borderColor: colors.line }}
              textStyle={{ color: active ? colors.white : colors.ink }}
              theme={{ colors: { onSurfaceVariant: active ? colors.white : colors.ink } }}
            >
              {item.label}
            </Chip>
          );
        })}
        {onToggleFollowing ? (
          <Chip
            testID="filter-following"
            selected={Boolean(following)}
            showSelectedCheck={false}
            icon="account-heart-outline"
            mode={following ? 'flat' : 'outlined'}
            onPress={onToggleFollowing}
            style={{ backgroundColor: following ? colors.gold : colors.surface, borderColor: colors.line }}
            textStyle={{ color: colors.ink }}
          >
            Quem sigo
          </Chip>
        ) : null}
      </View>

      {topics.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: spacing.sm, alignItems: 'center' }}>
          <Pressable onPress={() => onChangeTopic(null)}>
            <Text variant="labelLarge" style={{ color: !topicSlug ? colors.goldDark : colors.muted }}>
              Todos
            </Text>
          </Pressable>
          {topics.map((topic) => (
            <Pressable key={topic.slug} onPress={() => (onOpenTopic ? onOpenTopic(topic.slug) : onChangeTopic(topic.slug))} testID={`topic-${topic.slug}`}>
              <Text variant="labelLarge" style={{ color: topicSlug === topic.slug ? colors.goldDark : colors.muted }}>
                #{topic.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Text testID="feed-heading" variant="titleMedium" style={{ color: colors.ink, marginBottom: spacing.sm, marginTop: 4 }}>
        Publicações
      </Text>
      {loading && posts.length === 0 ? <SkeletonList rows={3} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Feed indisponível" body={error} /> : null}
      {!loading && posts.length === 0 && !error ? (
        <EmptyState icon="post-outline" title="Ainda não há publicações" body="Quando a Comunidade tiver posts, eles aparecem aqui." />
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onOpenAuthor={onOpenAuthor}
            onOpenPost={onOpenPost}
            onShare={onSharePost ? () => onSharePost(post) : undefined}
            onDelete={onDeletePost && post.isOwn ? () => onDeletePost(post) : undefined}
          />
        ))
      )}
      {hasMore && onLoadMore ? (
        <BrandButton variant="ghost" testID="load-more" label={loadingMore ? 'A carregar…' : 'Carregar mais'} disabled={loadingMore} loading={loadingMore} onPress={onLoadMore} />
      ) : null}
    </Screen>
  );
}
