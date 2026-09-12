import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CommunityScreen } from '../../../src/screens/CommunityScreen';

export default function ShortsRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const feed = useAsync(() => api.socialFeed({ sort: 'recent', videoFormat: 'SHORT', limit: 20 }), []);
  const topics = useAsync(() => api.socialTopics(), []);
  const access = useAsync(() => api.socialAccess(), []);

  return (
    <CommunityScreen
      posts={feed.data?.items ?? []}
      topics={topics.data ?? []}
      access={access.data}
      tab="shorts"
      loading={feed.loading}
      error={feed.error}
      showShorts
      onChangeTab={(next) => {
        if (next === 'shorts') return;
        router.replace('/(app)/(tabs)/community');
      }}
      onChangeTopic={() => undefined}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
      onOpenTopic={(slug) => router.push(`/(app)/community/t/${slug}`)}
      onCompose={() => router.push('/(app)/community/compose')}
      onRefresh={() => void feed.reload()}
      onReact={async (postId, type) => {
        await api.toggleReaction(postId, type);
        await feed.reload();
      }}
      onComment={async (postId, body) => {
        await api.createComment(postId, body);
        await feed.reload();
      }}
      onDelete={async (postId) => {
        await api.deletePost(postId);
        await feed.reload();
      }}
      onReport={async (postId, reason) => {
        await api.reportSocial({ targetType: 'POST', targetId: postId, reason });
      }}
    />
  );
}
