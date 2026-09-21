import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { PostCard } from '../components/PostCard';
import { BrandButton, EmptyState, LoadingState, Screen } from '../components/ui';
import type { SocialAccess, SocialPost, SocialTopic } from '../api/types';
import { colors, shadow, spacing, type } from '../theme';
import { COMMUNITY_AREAS, type CommunityAreaId } from './communityAreas';

const SORTS = [
  { id: 'recent', label: 'Recentes' },
  { id: 'trending', label: 'Em alta' },
  { id: 'foryou', label: 'Para si' },
] as const;

const ICON_AREAS = [
  { id: 'shorts', icon: 'play-outline' },
  { id: 'members', icon: 'people-outline' },
  { id: 'topics', icon: 'pricetags-outline' },
  { id: 'notifications', icon: 'notifications-outline' },
  { id: 'blocked', icon: 'ban-outline' },
  { id: 'edit', icon: 'create-outline' },
] as const;

function area(id: CommunityAreaId) {
  return COMMUNITY_AREAS.find((item) => item.id === id)!;
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
    <View style={{ flex: 1 }}>
    <Screen testID="community-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        {title !== 'Comunidade' ? (
          <Text style={{ flex: 1, color: colors.ink, fontFamily: type.display, fontSize: 28, lineHeight: 32 }}>{title}</Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {showHub && onSearch ? (
          <Pressable
            accessibilityLabel={area('search').label}
            testID="area-search"
            onPress={onSearch}
            hitSlop={8}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="search-outline" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
        {showHub && onOpenArea ? (
          <Pressable
            accessibilityLabel={area('me').label}
            testID="area-me"
            onPress={() => onOpenArea('me')}
            hitSlop={8}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
      {showHub && onOpenArea ? (
        <View testID="community-hub" style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
          {ICON_AREAS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityLabel={area(item.id).label}
              testID={`area-${item.id}`}
              onPress={() => onOpenArea(item.id)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.paper,
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Ionicons name={item.icon} size={18} color={colors.ink} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {!showHub && onSearch ? (
        <Pressable
          accessibilityLabel="Pesquisar"
          onPress={onSearch}
          testID="open-search"
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}
        >
          <Ionicons name="search-outline" size={22} color={colors.ink} />
        </Pressable>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 18, paddingBottom: spacing.sm, alignItems: 'center' }}
      >
        {SORTS.map((item) => (
          <Pressable key={item.id} testID={`sort-${item.id}`} onPress={() => onChangeSort(item.id)}>
            <Text
              style={{
                color: sort === item.id ? colors.ink : colors.muted,
                fontFamily: type.bodyBold,
                fontSize: 15,
                borderBottomWidth: sort === item.id ? 2 : 0,
                borderBottomColor: colors.gold,
                paddingBottom: 4,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
        {showHub && onToggleFollowing ? (
          <Pressable testID="filter-following" onPress={onToggleFollowing}>
            <Text
              style={{
                color: following ? colors.ink : colors.muted,
                fontFamily: type.bodyBold,
                fontSize: 15,
                borderBottomWidth: following ? 2 : 0,
                borderBottomColor: colors.gold,
                paddingBottom: 4,
              }}
            >
              Seguindo
            </Text>
          </Pressable>
        ) : null}
        {!showHub && onToggleFollowing ? (
          <Pressable testID="filter-following" onPress={onToggleFollowing}>
            <Text style={{ color: following ? colors.ink : colors.muted, fontFamily: type.bodyBold }}>Seguindo</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingBottom: spacing.md }}
      >
        <Pressable onPress={() => onChangeTopic(null)}>
          <Text style={{ color: !topicSlug ? colors.goldDark : colors.muted, fontFamily: type.bodyMedium }}>Todos</Text>
        </Pressable>
        {topics.map((topic) => (
          <Pressable
            key={topic.slug}
            testID={`topic-${topic.slug}`}
            onPress={() => (onOpenTopic ? onOpenTopic(topic.slug) : onChangeTopic(topic.slug))}
          >
            <Text style={{ color: topicSlug === topic.slug ? colors.goldDark : colors.muted, fontFamily: type.bodyMedium }}>
              {topic.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Feed indisponível" body={error} /> : null}
      {!loading && posts.length === 0 ? (
        <EmptyState title="Ainda não há publicações" body="" />
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />
        ))
      )}
      {hasMore && onLoadMore ? (
        <BrandButton variant="ghost" label="Carregar mais" onPress={onLoadMore} testID="load-more" />
      ) : null}
    </Screen>
    <Pressable
      accessibilityLabel={area('compose').label}
      testID={showHub ? 'area-compose' : 'compose-open'}
      onPress={onCompose}
      style={{
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow.card,
      }}
    >
      <Ionicons name="add" size={30} color={colors.ink} />
    </Pressable>
    </View>
  );
}
