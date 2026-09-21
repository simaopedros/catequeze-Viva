import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { CommunityScreen } from '../../../../src/screens/CommunityScreen';

export default function TopicRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [sort] = useState<'recent' | 'trending' | 'foryou'>('recent');
  const topicSlug = String(slug || '');
  const feed = useAsync(() => api.socialFeed({ sort, topicSlug }), [sort, topicSlug]);
  const topics = useAsync(() => api.socialTopics(), []);
  const access = useAsync(() => api.socialAccess(), []);
  const topic = (topics.data ?? []).find((item) => item.slug === topicSlug);

  return (
    <CommunityScreen
      variant="nested"
      title={topic?.name || 'Tópico'}
      subtitle="Publicações deste tema na Comunidade."
      posts={feed.data?.items ?? []}
      access={access.data}
      feedScope="all"
      onChangeFeedScope={() => undefined}
      loading={feed.loading}
      error={feed.error}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(postSlug) => router.push(`/(app)/community/p/${postSlug}`)}
      onCompose={() => router.push('/(app)/community/compose')}
    />
  );
}
