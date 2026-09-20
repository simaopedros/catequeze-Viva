import React from 'react';
import type { SocialSearch } from '../api/types';
import { PostCard } from '../components/PostCard';
import {
  AppText,
  EmptyState,
  ErrorState,
  Field,
  ListRow,
  LoadingState,
  Screen,
  ScreenTitle,
  SectionHeader,
} from '../components/ui';
import { copy } from '../copy/ptBR';

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
  const helper = query.trim().length > 0 && query.trim().length < 2 ? copy.search.hint : undefined;

  return (
    <Screen testID="search-screen">
      <ScreenTitle title={copy.search.title} subtitle={copy.search.subtitle} />
      <Field
        label={copy.search.label}
        placeholder={copy.search.placeholder}
        helper={helper}
        value={query}
        onChangeText={onChangeQuery}
        testID="search-input"
      />
      {query.trim().length < 2 && !loading ? (
        <AppText variant="caption" color="secondary">
          {copy.search.hint}
        </AppText>
      ) : null}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.search.errorTitle} body={error} /> : null}
      {empty ? <EmptyState title={copy.search.emptyTitle} body={copy.search.emptyBody} /> : null}
      {people.length > 0 ? (
        <>
          <SectionHeader title={copy.search.people} />
          {people.map((person) => {
            const handle = person.socialHandle || person.handle;
            return (
              <ListRow
                key={person.id}
                testID={`search-person-${person.id}`}
                title={person.displayName}
                meta={handle ? `@${handle} · ${person.followersCount ?? 0} seguidores` : copy.profile.noHandle}
                onPress={() => handle && onOpenAuthor(handle)}
              />
            );
          })}
        </>
      ) : null}
      {posts.length > 0 ? (
        <>
          <SectionHeader title={copy.search.posts} />
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onOpenAuthor={onOpenAuthor} onOpenPost={onOpenPost} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
