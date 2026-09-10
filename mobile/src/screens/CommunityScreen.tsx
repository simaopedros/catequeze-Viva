import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { PostCard } from '../components/PostCard';
import { BrandButton, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import type { SocialAccess, SocialPost, SocialTopic } from '../api/types';
import { colors, spacing } from '../theme';

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
}) {
  return (
    <Screen testID="community-screen">
      <ScreenTitle title={title} subtitle={subtitle} />
      {onSearch ? (
        <BrandButton variant="ghost" label="Pesquisar pessoas e publicações" onPress={onSearch} testID="open-search" />
      ) : null}
      {onToggleFollowing ? (
        <BrandButton
          variant={following ? 'primary' : 'ghost'}
          label={following ? 'A ver quem segue' : 'Só quem eu sigo'}
          onPress={onToggleFollowing}
          testID="filter-following"
        />
      ) : null}
      {access && !access.canPublish ? (
        <Text style={{ color: colors.goldDark, marginBottom: spacing.md }}>
          {access.reason === 'subscription'
            ? 'Pode ler e seguir. Para publicar, precisa de uma assinatura activa.'
            : 'A publicação está limitada nesta conta.'}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        {SORTS.map((item) => (
          <Pressable
            key={item.id}
            testID={`sort-${item.id}`}
            onPress={() => onChangeSort(item.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: sort === item.id ? colors.ink : colors.paper,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Text style={{ color: sort === item.id ? colors.white : colors.ink, fontWeight: '600' }}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        <Pressable onPress={() => onChangeTopic(null)}>
          <Text style={{ color: !topicSlug ? colors.goldDark : colors.muted, fontWeight: '700' }}>Todos</Text>
        </Pressable>
        {topics.map((topic) => (
          <Pressable
            key={topic.slug}
            onPress={() => (onOpenTopic ? onOpenTopic(topic.slug) : onChangeTopic(topic.slug))}
            testID={`topic-${topic.slug}`}
          >
            <Text style={{ color: topicSlug === topic.slug ? colors.goldDark : colors.muted, fontWeight: '700' }}>
              {topic.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {access?.canPublish ? <BrandButton label="Nova publicação" onPress={onCompose} testID="compose-open" /> : null}
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
  );
}
