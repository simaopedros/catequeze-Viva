import React from 'react';
import { Pressable } from 'react-native';
import type { SocialSearch } from '../api/types';
import { Avatar } from '../components/Avatar';
import { PostCard } from '../components/PostCard';
import { EmptyState, ListCard, ListRow, Screen, ScreenTitle, SearchBar, SectionHeader, SkeletonList } from '../components/ui';

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
      <SearchBar value={query} onChangeText={onChangeQuery} placeholder="Nome, @ ou palavra" testID="search-input" autoFocus />
      {loading ? <SkeletonList rows={2} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Pesquisa indisponível" body={error} /> : null}
      {query.trim().length < 2 && !loading ? (
        <EmptyState icon="magnify" title="Comece a escrever" body="Pesquise por pessoas, @ ou palavras das publicações." />
      ) : null}
      {empty ? <EmptyState icon="magnify-close" title="Nada encontrado" body="Tente um @, um nome ou uma palavra da publicação." /> : null}
      {people.length > 0 ? (
        <>
          <SectionHeader title="Pessoas" icon="account-outline" />
          <ListCard>
            {people.map((person, index) => {
              const handle = person.socialHandle || person.handle;
              return (
                <ListRow
                  key={person.id}
                  testID={`search-person-${person.id}`}
                  left={<Avatar name={person.displayName} url={person.avatarUrl} size={36} />}
                  title={person.displayName}
                  subtitle={`${handle ? `@${handle}` : 'Sem handle'} · ${person.followersCount ?? 0} seguidores`}
                  onPress={handle ? () => onOpenAuthor(handle) : undefined}
                  last={index === people.length - 1}
                />
              );
            })}
          </ListCard>
        </>
      ) : null}
      {posts.length > 0 ? (
        <>
          <SectionHeader title="Publicações" icon="post-outline" />
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
