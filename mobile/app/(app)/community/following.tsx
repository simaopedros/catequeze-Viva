import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CommunityScreen } from '../../../src/screens/CommunityScreen';

export default function FollowingFeedRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [sort] = useState<'recent' | 'trending' | 'foryou'>('recent');
  const feed = useAsync(() => api.socialFeed({ sort, following: true }), [sort]);
  const access = useAsync(() => api.socialAccess(), []);

  return (
    <CommunityScreen
      variant="nested"
      title="A seguir"
      subtitle="Só publicações de quem você segue."
      posts={feed.data?.items ?? []}
      access={access.data}
      feedScope="all"
      onChangeFeedScope={() => undefined}
      loading={feed.loading}
      error={feed.error}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
      onCompose={() => router.push('/(app)/community/compose')}
    />
  );
}
