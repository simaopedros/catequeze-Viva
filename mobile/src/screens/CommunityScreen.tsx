import React from 'react';
import { View } from 'react-native';
import { PostCard } from '../components/PostCard';
import {
  AppText,
  Banner,
  BrandButton,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  PressableScale,
  Screen,
  ScreenTitle,
  SectionHeader,
} from '../components/ui';
import type { SocialAccess, SocialPost, SocialTopic } from '../api/types';
import { copy } from '../copy/ptBR';
import { spacing } from '../theme';
import { COMMUNITY_AREAS, type CommunityAreaId } from './communityAreas';

const SORTS = [
  { id: 'recent', label: copy.community.sorts.recent },
  { id: 'trending', label: copy.community.sorts.trending },
  { id: 'foryou', label: copy.community.sorts.foryou },
] as const;

export function CommunityScreen({
  title = copy.community.title,
  subtitle = copy.community.subtitle,
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
  onRefresh,
  refreshing,
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
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <Screen testID="community-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={title} subtitle={subtitle} />
      {showHub && onOpenArea ? (
        <View testID="community-hub" style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {COMMUNITY_AREAS.filter((area) => area.id !== 'feed').map((area) => (
              <PressableScale
                key={area.id}
                testID={`area-${area.id}`}
                onPress={() => onOpenArea(area.id)}
                accessibilityHint={area.hint}
                style={{ width: '48%' }}
              >
                <Card style={{ marginBottom: 0 }}>
                  <AppText variant="caption" weight="bold">
                    {area.label}
                  </AppText>
                  <AppText variant="micro" color="secondary" style={{ marginTop: 2 }}>
                    {area.hint}
                  </AppText>
                </Card>
              </PressableScale>
            ))}
          </View>
        </View>
      ) : null}
      {!showHub && onSearch ? (
        <BrandButton variant="ghost" label={copy.community.searchPeople} onPress={onSearch} testID="open-search" />
      ) : null}
      {!showHub && onToggleFollowing ? (
        <BrandButton
          variant={following ? 'primary' : 'ghost'}
          label={following ? copy.community.followingOn : copy.community.followingOff}
          onPress={onToggleFollowing}
          testID="filter-following"
        />
      ) : null}
      {access && !access.canPublish ? (
        <Banner>
          {access.reason === 'subscription' ? copy.community.subscribeBanner : copy.community.limitedBanner}
        </Banner>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
        {SORTS.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            active={sort === item.id}
            testID={`sort-${item.id}`}
            onPress={() => onChangeSort(item.id)}
          />
        ))}
        {showHub && onToggleFollowing ? (
          <Chip
            label={copy.community.followingChip}
            active={following}
            testID="filter-following"
            onPress={onToggleFollowing}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        <Chip label={copy.common.all} active={!topicSlug} onPress={() => onChangeTopic(null)} />
        {topics.map((topic) => (
          <Chip
            key={topic.slug}
            label={topic.name}
            active={topicSlug === topic.slug}
            testID={`topic-${topic.slug}`}
            onPress={() => (onOpenTopic ? onOpenTopic(topic.slug) : onChangeTopic(topic.slug))}
          />
        ))}
      </View>
      <BrandButton label={copy.community.compose} onPress={onCompose} testID="compose-open" />
      <SectionHeader title={copy.community.posts} testID="feed-heading" />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.community.errorTitle} body={error} /> : null}
      {!loading && posts.length === 0 ? (
        <EmptyState title={copy.community.emptyTitle} body={copy.community.emptyBody} />
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />
        ))
      )}
    </Screen>
  );
}
