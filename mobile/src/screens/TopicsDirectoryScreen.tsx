import React from 'react';
import type { SocialTopic } from '../api/types';
import { EmptyState, ListCard, ListRow, Screen, ScreenTitle, SkeletonList } from '../components/ui';

export function TopicsDirectoryScreen({
  topics,
  loading,
  error,
  onOpenTopic,
}: {
  topics: SocialTopic[];
  loading?: boolean;
  error?: string | null;
  onOpenTopic: (slug: string) => void;
}) {
  return (
    <Screen testID="topics-screen">
      <ScreenTitle title="Tópicos" subtitle="As áreas temáticas da Comunidade — toque para abrir o feed." />
      {loading && topics.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Tópicos indisponíveis" body={error} /> : null}
      {!loading && topics.length === 0 && !error ? <EmptyState icon="pound" title="Ainda sem tópicos" body="Quando a Comunidade tiver temas ativos, eles aparecem aqui." /> : null}
      {topics.length > 0 ? (
        <ListCard>
          {topics.map((topic, index) => (
            <ListRow
              key={topic.slug}
              testID={`topic-card-${topic.slug}`}
              icon="pound"
              title={topic.name}
              subtitle={`#${topic.slug}`}
              meta={topic.postCount != null ? `${topic.postCount} publ.` : undefined}
              onPress={() => onOpenTopic(topic.slug)}
              last={index === topics.length - 1}
            />
          ))}
        </ListCard>
      ) : null}
    </Screen>
  );
}
