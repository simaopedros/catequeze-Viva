import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CommunityScreen } from '../../../src/screens/CommunityScreen';

export default function FollowingFeedRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const feed = useAsync(() => api.socialFeed({ sort: 'recent', following: true, videoFormat: 'SHORT', limit: 20 }), []);
  const access = useAsync(() => api.socialAccess(), []);

  return (
    <CommunityScreen
      posts={feed.data?.items ?? []}
      access={access.data}
      tab="following"
      loading={feed.loading}
      error={feed.error}
      hasMore={Boolean(feed.data?.nextCursor)}
      onChangeTab={(next) => {
        if (next === 'following') return;
        router.replace('/(app)/(tabs)/community');
      }}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
      onCompose={() => router.push('/(app)/community/compose')}
      onUpload={() => router.push('/(app)/community/upload')}
      onSearch={() => router.push('/(app)/community/search')}
      onOpenTopics={() => router.push('/(app)/community/topics')}
      onOpenMembers={() => router.push('/(app)/community/members')}
      onRefresh={() => void feed.reload()}
      onReact={async (postId, type) => {
        await api.toggleReaction(postId, type);
        await feed.reload();
      }}
      onComment={async (postId, body) => {
        await api.createComment(postId, body);
        await feed.reload();
      }}
    />
  );
}
