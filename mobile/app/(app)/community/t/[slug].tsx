import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { CommunityScreen } from '../../../../src/screens/CommunityScreen';

export default function TopicRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [sort, setSort] = useState<'recent' | 'trending' | 'foryou'>('recent');
  const topicSlug = String(slug || '');
  const feed = useAsync(() => api.socialFeed({ sort, topicSlug }), [sort, topicSlug]);
  const topics = useAsync(() => api.socialTopics(), []);
  const access = useAsync(() => api.socialAccess(), []);
  const topic = (topics.data ?? []).find((item) => item.slug === topicSlug);

  return (
    <CommunityScreen
      title={topic?.name || 'Tópico'}
      subtitle="Publicações deste tema na Comunidade."
      posts={feed.data?.items ?? []}
      topics={topics.data ?? []}
      access={access.data}
      sort={sort}
      topicSlug={topicSlug}
      loading={feed.loading}
      error={feed.error}
      onChangeSort={setSort}
      onChangeTopic={(next) => {
        if (!next) router.replace('/(app)/(tabs)/community');
        else router.replace(`/(app)/community/t/${next}`);
      }}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(postSlug) => router.push(`/(app)/community/p/${postSlug}`)}
      onOpenTopic={(next) => router.replace(`/(app)/community/t/${next}`)}
      onCompose={() => router.push('/(app)/community/compose')}
      onSearch={() => router.push('/(app)/community/search')}
    />
  );
}
