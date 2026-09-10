import React from 'react';
import { Pressable, Text } from 'react-native';
import type { SocialTopic } from '../api/types';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

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
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Tópicos indisponíveis" body={error} /> : null}
      {!loading && topics.length === 0 ? (
        <EmptyState title="Ainda sem tópicos" body="Quando a Comunidade tiver temas activos, eles aparecem aqui." />
      ) : null}
      {topics.map((topic) => (
        <Pressable key={topic.slug} testID={`topic-card-${topic.slug}`} onPress={() => onOpenTopic(topic.slug)}>
          <Card>
            <Text style={{ color: colors.goldDark, fontWeight: '700' }}>#{topic.slug}</Text>
            <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 4 }}>{topic.name}</Text>
            {topic.postCount != null ? (
              <Text style={{ color: colors.muted, marginTop: 4 }}>{topic.postCount} publicações</Text>
            ) : null}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
