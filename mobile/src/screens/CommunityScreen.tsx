import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { PostCard } from '../components/PostCard';
import { BrandButton, EmptyState, HubTile, LoadingState, Screen, ScreenTitle } from '../components/ui';
import type { SocialAccess, SocialPost, SocialTopic } from '../api/types';
import { colors, radius, spacing, type } from '../theme';
import { COMMUNITY_AREAS, type CommunityAreaId } from './communityAreas';

const SORTS = [
  { id: 'recent', label: 'Recentes' },
  { id: 'trending', label: 'Em alta' },
  { id: 'foryou', label: 'Para si' },
] as const;

const GRID_AREAS = ['shorts', 'following', 'topics', 'members'] as const;
const ACCOUNT_AREAS = ['me', 'edit', 'blocked', 'notifications'] as const;

function area(id: CommunityAreaId) {
  return COMMUNITY_AREAS.find((item) => item.id === id)!;
}

function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.ink : colors.paper,
        borderWidth: 1,
        borderColor: active ? colors.ink : colors.line,
      }}
    >
      <Text style={{ color: active ? colors.white : colors.ink, fontFamily: type.bodyBold, fontSize: 13 }}>{label}</Text>
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
  hasMore,
  onLoadMore,
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
  hasMore?: boolean;
  onLoadMore?: () => void;
}) {
  return (
    <Screen testID="community-screen">
      <ScreenTitle title={title} subtitle={subtitle} />
      {showHub && onOpenArea ? (
        <View testID="community-hub" style={{ marginBottom: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <BrandButton label={area('compose').label} onPress={onCompose} testID="area-compose" />
            </View>
            {onSearch ? (
              <View style={{ flex: 1 }}>
                <BrandButton variant="ghost" label={area('search').label} onPress={onSearch} testID="area-search" />
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {GRID_AREAS.map((id) => {
              const item = area(id);
              return (
                <HubTile
                  key={id}
                  label={item.label}
                  hint={item.hint}
                  testID={`area-${id}`}
                  onPress={() => onOpenArea(id)}
                />
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingVertical: 4 }}>
            {ACCOUNT_AREAS.map((id) => (
              <Pressable key={id} testID={`area-${id}`} onPress={() => onOpenArea(id)}>
                <Text style={{ color: colors.muted, fontFamily: type.bodyMedium, fontSize: 13 }}>{area(id).label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {!showHub ? <BrandButton label="Nova publicação" onPress={onCompose} testID="compose-open" /> : null}
      {!showHub && onSearch ? (
        <BrandButton variant="ghost" label="Pesquisar pessoas e publicações" onPress={onSearch} testID="open-search" />
      ) : null}
      {!showHub && onToggleFollowing ? (
        <BrandButton
          variant={following ? 'primary' : 'ghost'}
          label={following ? 'A ver quem segue' : 'Só quem eu sigo'}
          onPress={onToggleFollowing}
          testID="filter-following"
        />
      ) : null}
      {access && !access.canPublish ? (
        <View
          style={{
            backgroundColor: colors.cream,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.line,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ color: colors.goldDark, fontFamily: type.bodyMedium, lineHeight: 20 }}>
            {access.reason === 'subscription'
              ? 'Pode ler e seguir. Para publicar, precisa de uma assinatura activa.'
              : 'A publicação está limitada nesta conta.'}
          </Text>
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: spacing.sm }}
      >
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
          <Chip label="Quem sigo" active={following} testID="filter-following" onPress={onToggleFollowing} />
        ) : null}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: spacing.md }}
      >
        <Chip label="Todos" active={!topicSlug} onPress={() => onChangeTopic(null)} />
        {topics.map((topic) => (
          <Chip
            key={topic.slug}
            label={topic.name}
            active={topicSlug === topic.slug}
            testID={`topic-${topic.slug}`}
            onPress={() => (onOpenTopic ? onOpenTopic(topic.slug) : onChangeTopic(topic.slug))}
          />
        ))}
      </ScrollView>
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Feed indisponível" body={error} /> : null}
      {!loading && posts.length === 0 ? (
        <EmptyState title="Ainda não há publicações" body="Quando a Comunidade tiver posts, eles aparecem aqui." />
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />
        ))
      )}
      {hasMore && onLoadMore ? (
        <BrandButton variant="ghost" label="Carregar mais" onPress={onLoadMore} testID="load-more" />
      ) : null}
    </Screen>
  );
}
