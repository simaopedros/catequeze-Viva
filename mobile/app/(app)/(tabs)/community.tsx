import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CommunityScreen } from '../../../src/screens/CommunityScreen';

export default function CommunityRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [sort, setSort] = useState<'recent' | 'trending' | 'foryou'>('recent');
  const [topicSlug, setTopicSlug] = useState<string | null>(null);
  const feed = useAsync(() => api.socialFeed({ sort, topicSlug }), [sort, topicSlug]);
  const topics = useAsync(() => api.socialTopics(), []);
  const access = useAsync(() => api.socialAccess(), []);

  return (
    <CommunityScreen
      posts={feed.data?.items ?? []}
      topics={topics.data ?? []}
      access={access.data}
      sort={sort}
      topicSlug={topicSlug}
      loading={feed.loading}
      error={feed.error}
      onChangeSort={setSort}
      onChangeTopic={setTopicSlug}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onCompose={() => router.push('/(app)/community/compose')}
    />
  );
}
