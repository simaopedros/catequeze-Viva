import React from 'react';
import type { SocialTopic } from '../api/types';
import { EmptyState, ErrorState, ListRow, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';

export function TopicsDirectoryScreen({
  topics,
  loading,
  error,
  onOpenTopic,
  onRefresh,
  refreshing,
}: {
  topics: SocialTopic[];
  loading?: boolean;
  error?: string | null;
  onOpenTopic: (slug: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <Screen testID="topics-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={copy.topics.title} subtitle={copy.topics.subtitle} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.topics.errorTitle} body={error} /> : null}
      {!loading && topics.length === 0 ? (
        <EmptyState title={copy.topics.emptyTitle} body={copy.topics.emptyBody} />
      ) : null}
      {topics.map((topic) => (
        <ListRow
          key={topic.slug}
          testID={`topic-card-${topic.slug}`}
          title={topic.name}
          meta={`#${topic.slug}${topic.postCount != null ? ` · ${copy.topics.posts(topic.postCount)}` : ''}`}
          onPress={() => onOpenTopic(topic.slug)}
        />
      ))}
    </Screen>
  );
}
