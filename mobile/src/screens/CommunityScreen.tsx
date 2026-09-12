import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { PostCard } from '../components/PostCard';
import { BrandButton, EmptyState, LoadingState, Screen, ScreenTitle, SegmentedControl } from '../components/ui';
import type { SocialAccess, SocialPost, SocialTopic } from '../api/types';
import { colors, fonts, spacing } from '../theme';
import { COMMUNITY_AREAS, type CommunityAreaId } from './communityAreas';

const SORTS = [
  { id: 'recent', label: 'Recentes' },
  { id: 'trending', label: 'Em alta' },
  { id: 'foryou', label: 'Para si' },
];

export function communityFeedSubtitle(access?: SocialAccess | null): string {
  if (access && !access.canPublish) {
    return 'Ler e seguir é livre. Publicar pede assinatura.';
  }
  return 'Ler, seguir e partilhar com a rede da catequese.';
}

export function CommunityScreen({
  title = 'Comunidade',
  subtitle,
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
  onReact,
  onShortcutVerse,
  onShortcutMeeting,
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
  onReact?: (postId: string, type: 'AMEM' | 'REZO' | 'ALELUIA') => void;
  onShortcutVerse?: () => void;
  onShortcutMeeting?: () => void;
}) {
  const resolvedSubtitle = subtitle ?? communityFeedSubtitle(access);

  return (
    <Screen testID="community-screen">
      <ScreenTitle title={title} subtitle={resolvedSubtitle} />
      {showHub && onOpenArea ? (
        <View testID="community-hub" style={{ marginBottom: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {COMMUNITY_AREAS.filter((area) => area.id !== 'feed').map((area) => (
            <Pressable
              key={area.id}
              testID={`area-${area.id}`}
              onPress={() => onOpenArea(area.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                minHeight: 36,
                borderRadius: 999,
                backgroundColor: colors.canvas,
              }}
            >
              <Text style={{ color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 13 }}>{area.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <SegmentedControl options={SORTS} value={sort} onChange={(id) => onChangeSort(id as typeof sort)} testID="sort" />
      {!showHub && onSearch ? (
        <BrandButton variant="ghost" label="Pesquisar pessoas e publicações" onPress={onSearch} testID="open-search" />
      ) : null}
      {showHub && onToggleFollowing ? (
        <Pressable onPress={onToggleFollowing} testID="filter-following" style={{ marginBottom: spacing.sm }}>
          <Text style={{ color: following ? colors.goldDark : colors.muted, fontFamily: fonts.sansSemi }}>
            {following ? 'A ver quem segue' : 'Só quem eu sigo'}
          </Text>
        </Pressable>
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
        <Text style={{ color: colors.goldDark, marginBottom: spacing.md, fontFamily: fonts.sansMedium }}>
          {access.reason === 'subscription'
            ? 'Pode ler e seguir. Para publicar, precisa de uma assinatura activa.'
            : 'A publicação está limitada nesta conta.'}
        </Text>
      ) : null}
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
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
        <BrandButton label="Nova publicação" onPress={onCompose} testID="compose-open" />
      </View>
      {onShortcutVerse || onShortcutMeeting ? (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
          {onShortcutVerse ? (
            <Pressable testID="shortcut-verse" onPress={onShortcutVerse} style={{ flex: 1, minHeight: 44, justifyContent: 'center', backgroundColor: colors.canvas, borderRadius: 12, padding: 10 }}>
              <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>Partilhar um verso</Text>
            </Pressable>
          ) : null}
          {onShortcutMeeting ? (
            <Pressable testID="shortcut-meeting" onPress={onShortcutMeeting} style={{ flex: 1, minHeight: 44, justifyContent: 'center', backgroundColor: colors.canvas, borderRadius: 12, padding: 10 }}>
              <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>Partilhar um encontro</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text
        testID="feed-heading"
        style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 20, marginBottom: spacing.sm }}
      >
        Publicações
      </Text>
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Feed indisponível" body={error} /> : null}
      {!loading && posts.length === 0 ? (
        <EmptyState
          title="Ainda não há publicações"
          body="A Comunidade está pronta. Toque em Publicar para a primeira partilha, ou abra Tópicos e Membros."
        />
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onOpenAuthor={onOpenAuthor}
            onOpenPost={onOpenPost}
            onReact={onReact ? (type) => onReact(post.id, type) : undefined}
          />
        ))
      )}
    </Screen>
  );
}
