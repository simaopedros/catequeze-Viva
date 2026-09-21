import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { PostCard } from '../components/PostCard';
import { EmptyState, FilterChip, LoadingState, PrimaryButton, Screen, ScreenTitle } from '../components/ui';
import type { SocialAccess, SocialPost, SocialTopic } from '../api/types';
import { colors, elevation, spacing } from '../theme';
import { COMMUNITY_AREAS, type CommunityAreaId } from './communityAreas';

const SORTS = [
  { id: 'recent', label: 'Recentes' },
  { id: 'trending', label: 'Em alta' },
  { id: 'foryou', label: 'Para si' },
] as const;

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
}) {
  return (
    <View style={{ flex: 1 }}>
    <Screen testID="community-screen" variant="feed">
      <ScreenTitle title={title} subtitle={subtitle} />
      {showHub && onOpenArea ? (
        <View testID="community-hub" style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {COMMUNITY_AREAS.filter((area) => area.id !== 'feed').map((area) => (
              <FilterChip
                key={area.id}
                label={area.label}
                testID={`area-${area.id}`}
                onPress={() => onOpenArea(area.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {!showHub && onSearch ? (
        <PrimaryButton variant="ghost" label="Pesquisar" onPress={onSearch} testID="open-search" />
      ) : null}
      {access && !access.canPublish ? (
        <Text style={{ color: colors.accent[700], marginBottom: spacing.md }}>
          {access.reason === 'subscription'
            ? 'Pode ler e seguir. Para publicar, precisa de uma assinatura activa.'
            : 'A publicação está limitada nesta conta.'}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
        {SORTS.map((item) => (
          <FilterChip
            key={item.id}
            label={item.label}
            active={sort === item.id && !following}
            testID={`sort-${item.id}`}
            onPress={() => {
              onChangeSort(item.id);
              if (following && onToggleFollowing) onToggleFollowing();
            }}
          />
        ))}
        {onToggleFollowing ? (
          <FilterChip
            label="Seguindo"
            active={following}
            testID="filter-following"
            onPress={onToggleFollowing}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        <Pressable onPress={() => onChangeTopic(null)}>
          <Text style={{ color: !topicSlug ? colors.accent[700] : colors.text.muted, fontWeight: '700' }}>Todos</Text>
        </Pressable>
        {topics.map((topic) => (
          <Pressable
            key={topic.slug}
            onPress={() => (onOpenTopic ? onOpenTopic(topic.slug) : onChangeTopic(topic.slug))}
            testID={`topic-${topic.slug}`}
          >
            <Text style={{ color: topicSlug === topic.slug ? colors.accent[700] : colors.text.muted, fontWeight: '700' }}>
              {topic.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Feed indisponível" body={error} /> : null}
      {!loading && posts.length === 0 ? (
        <EmptyState title="Ainda não há publicações" body="Quando a Comunidade tiver posts, eles aparecem aqui." />
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />
        ))
      )}
    </Screen>
    <Pressable
      testID="compose-open"
      onPress={onCompose}
      style={{
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent[500],
        alignItems: 'center',
        justifyContent: 'center',
        ...elevation.card,
      }}
    >
      <Plus color={colors.text.primary} size={24} />
    </Pressable>
    </View>
  );
}
