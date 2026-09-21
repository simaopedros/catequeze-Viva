import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { SocialSearch } from '../api/types';
import { PostCard } from '../components/PostCard';
import { Avatar, EmptyState, LoadingState, Screen } from '../components/ui';
import { colors, spacing, type } from '../theme';

export function SearchScreen({
  query,
  onChangeQuery,
  results,
  loading,
  error,
  onOpenAuthor,
  onOpenPost,
}: {
  query: string;
  onChangeQuery: (value: string) => void;
  results?: SocialSearch | null;
  loading?: boolean;
  error?: string | null;
  onOpenAuthor: (handle: string) => void;
  onOpenPost: (slug: string) => void;
}) {
  const people = results?.people ?? [];
  const posts = results?.posts ?? [];
  const empty = query.trim().length >= 2 && !loading && people.length === 0 && posts.length === 0;

  return (
    <Screen testID="search-screen">
      <TextInput
        value={query}
        onChangeText={onChangeQuery}
        testID="search-input"
        placeholder="Pesquisar"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoFocus
        style={{
          backgroundColor: colors.paper,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.line,
          paddingHorizontal: 18,
          minHeight: 48,
          color: colors.ink,
          fontFamily: type.body,
          fontSize: 16,
          marginBottom: spacing.md,
        }}
      />
      {loading ? <LoadingState label="" /> : null}
      {error ? <EmptyState title="Pesquisa indisponível" body={error} /> : null}
      {empty ? <EmptyState title="Nada encontrado" body="Tente um nome ou uma palavra." /> : null}
      {people.map((person) => {
        const handle = person.socialHandle || person.handle;
        return (
          <Pressable
            key={person.id}
            testID={`search-person-${person.id}`}
            onPress={() => handle && onOpenAuthor(handle)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10 }}
          >
            <Avatar name={person.displayName} imageUrl={person.avatarUrl} />
            <View>
              <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>{person.displayName}</Text>
              {handle ? <Text style={{ color: colors.muted, fontFamily: type.body }}>@{handle}</Text> : null}
            </View>
          </Pressable>
        );
      })}
      {posts.map((post) => (
        <Pressable key={post.id} testID={`search-post-${post.id}`} onPress={() => onOpenPost(post.slug)}>
          <PostCard post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />
        </Pressable>
      ))}
    </Screen>
  );
}
