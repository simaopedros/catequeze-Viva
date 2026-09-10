import React from 'react';
import { Pressable, Text } from 'react-native';
import type { SocialSearch } from '../api/types';
import { PostCard } from '../components/PostCard';
import { Card, EmptyState, Field, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors, spacing } from '../theme';

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
      <ScreenTitle title="Pesquisar" subtitle="Encontre catequistas, tópicos e publicações da Comunidade." />
      <Field label="Pesquisar" value={query} onChangeText={onChangeQuery} testID="search-input" />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Pesquisa indisponível" body={error} /> : null}
      {empty ? (
        <EmptyState title="Nada encontrado" body="Tente um @, um nome ou uma palavra da publicação." />
      ) : null}
      {people.length > 0 ? (
        <>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18, marginBottom: spacing.sm }}>Pessoas</Text>
          {people.map((person) => {
            const handle = person.socialHandle || person.handle;
            return (
              <Pressable
                key={person.id}
                testID={`search-person-${person.id}`}
                onPress={() => handle && onOpenAuthor(handle)}
              >
                <Card>
                  <Text style={{ color: colors.ink, fontWeight: '700' }}>{person.displayName}</Text>
                  <Text style={{ color: colors.goldDark, marginTop: 2 }}>
                    {handle ? `@${handle}` : 'Sem handle'} · {person.followersCount ?? 0} seguidores
                  </Text>
                </Card>
              </Pressable>
            );
          })}
        </>
      ) : null}
      {posts.length > 0 ? (
        <>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18, marginBottom: spacing.sm }}>
            Publicações
          </Text>
          {posts.map((post) => (
            <Pressable key={post.id} testID={`search-post-${post.id}`} onPress={() => onOpenPost(post.slug)}>
              <PostCard post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />
            </Pressable>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
