import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { PostCard } from '../components/PostCard';
import {
  CommunityComposeCard,
  CommunityFeedScope,
  CommunityScopeFilters,
  CommunityScreenHeader,
} from '../components/communityUi';
import { EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import type { SocialAccess, SocialPost, SocialTopic } from '../api/types';
import { colors, spacing } from '../theme';
import type { CommunityAreaId } from './communityAreas';

function filterByScope(posts: SocialPost[], scope: CommunityFeedScope) {
  if (scope === 'parish') return posts.filter((p) => Boolean(p.parish?.id));
  if (scope === 'classes') return posts.filter((p) => !p.parish?.id);
  return posts;
}

export function CommunityScreen({
  variant = 'main',
  title,
  subtitle,
  posts,
  access,
  loading,
  error,
  onOpenAuthor,
  onOpenPost,
  onCompose,
  onOpenLink,
  feedScope,
  onChangeFeedScope,
  viewerName,
  viewerAvatarUrl,
  showHub,
  onOpenArea,
}: {
  variant?: 'main' | 'nested';
  title?: string;
  subtitle?: string;
  posts: SocialPost[];
  topics?: SocialTopic[];
  access?: SocialAccess | null;
  sort?: 'recent' | 'trending' | 'foryou';
  topicSlug?: string | null;
  loading?: boolean;
  error?: string | null;
  onChangeSort?: (sort: 'recent' | 'trending' | 'foryou') => void;
  onChangeTopic?: (slug: string | null) => void;
  onOpenAuthor: (handle: string) => void;
  onOpenPost?: (slug: string) => void;
  onOpenTopic?: (slug: string) => void;
  onCompose: () => void;
  onSearch?: () => void;
  following?: boolean;
  onToggleFollowing?: () => void;
  onOpenLink?: () => void;
  feedScope: CommunityFeedScope;
  onChangeFeedScope: (scope: CommunityFeedScope) => void;
  viewerName?: string;
  viewerAvatarUrl?: string | null;
  showHub?: boolean;
  onOpenArea?: (id: CommunityAreaId) => void;
}) {
  const visiblePosts = useMemo(() => filterByScope(posts, feedScope), [posts, feedScope]);
  const canPublish = access?.canPublish !== false;

  return (
    <Screen testID="community-screen" variant="feed" safeAreaEdges={variant === 'main' ? ['top', 'left', 'right'] : ['left', 'right']}>
      {variant === 'main' ? <CommunityScreenHeader onLinkPress={onOpenLink} /> : null}
      {variant === 'nested' && title ? <ScreenTitle title={title} subtitle={subtitle} /> : null}

      {showHub && onOpenArea ? <View testID="community-hub" style={{ display: 'none' }} /> : null}

      {variant === 'main' ? <CommunityScopeFilters value={feedScope} onChange={onChangeFeedScope} /> : null}

      {variant === 'main' ? (
      <CommunityComposeCard
        userName={viewerName}
        avatarUrl={viewerAvatarUrl}
        onCompose={onCompose}
        disabled={!canPublish}
      />
      ) : null}

      {access && !access.canPublish ? (
        <Text style={{ color: colors.accent[700], marginBottom: spacing.md }}>
          {access.reason === 'subscription'
            ? 'Pode ler e seguir. Para publicar, precisa de uma assinatura activa.'
            : 'A publicação está limitada nesta conta.'}
        </Text>
      ) : null}

      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Feed indisponível" body={error} /> : null}
      {!loading && visiblePosts.length === 0 ? (
        <EmptyState title="Ainda não há publicações" body="Quando a Comunidade tiver posts, eles aparecem aqui." />
      ) : (
        visiblePosts.map((post) => (
          <PostCard key={post.id} post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />
        ))
      )}
    </Screen>
  );
}
