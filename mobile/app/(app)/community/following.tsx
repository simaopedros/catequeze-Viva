import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CommunityScreen } from '../../../src/screens/CommunityScreen';

export default function FollowingFeedRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [sort, setSort] = useState<'recent' | 'trending' | 'foryou'>('recent');
  const feed = useAsync(() => api.socialFeed({ sort, following: true }), [sort]);
  const topics = useAsync(() => api.socialTopics(), []);
  const access = useAsync(() => api.socialAccess(), []);

  return (
    <CommunityScreen
      title="A seguir"
      subtitle="Só publicações de quem você segue."
      posts={feed.data?.items ?? []}
      topics={topics.data ?? []}
      access={access.data}
      sort={sort}
      following
      loading={feed.loading}
      error={feed.error}
      onChangeSort={setSort}
      onChangeTopic={() => undefined}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
      onOpenTopic={(slug) => router.push(`/(app)/community/t/${slug}`)}
      onCompose={() => router.push('/(app)/community/compose')}
      onSearch={() => router.push('/(app)/community/search')}
    />
  );
}
