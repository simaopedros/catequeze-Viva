import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ShortsScreen } from '../../../src/screens/ShortsScreen';

export default function ShortsRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [sort] = useState<'recent' | 'trending' | 'foryou'>('recent');
  const feed = useAsync(() => api.socialFeed({ sort, videoFormat: 'SHORT' }), [sort]);

  return (
    <ShortsScreen
      posts={feed.data?.items ?? []}
      loading={feed.loading}
      error={feed.error}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onReact={(postId) => {
        void api.toggleReaction(postId, 'AMEM');
      }}
    />
  );
}
