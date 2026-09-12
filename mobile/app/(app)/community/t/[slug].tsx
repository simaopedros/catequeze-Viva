import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { feedQueryForTab, type FeedTabId } from '../../../../src/lib/social';
import { CommunityScreen } from '../../../../src/screens/CommunityScreen';

export default function TopicRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<FeedTabId>('recent');
  const topicSlug = String(slug || '');
  const query = useMemo(() => feedQueryForTab(tab), [tab]);
  const feed = useAsync(
    () => api.socialFeed({ ...query, topicSlug, limit: 20 }),
    [query.sort, query.following, query.videoFormat, topicSlug],
  );
  const shortsProbe = useAsync(() => api.socialFeed({ videoFormat: 'SHORT', limit: 1 }), []);
  const topics = useAsync(() => api.socialTopics(), []);
  const access = useAsync(() => api.socialAccess(), []);

  return (
    <CommunityScreen
      posts={feed.data?.items ?? []}
      topics={topics.data ?? []}
      access={access.data}
      tab={tab}
      topicSlug={topicSlug}
      loading={feed.loading}
      error={feed.error}
      hasMore={Boolean(feed.data?.nextCursor)}
      showShorts={Boolean(shortsProbe.data?.items.length)}
      onChangeTab={setTab}
      onChangeTopic={(next) => {
        if (!next) router.replace('/(app)/(tabs)/community');
        else router.replace(`/(app)/community/t/${next}`);
      }}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(postSlug) => router.push(`/(app)/community/p/${postSlug}`)}
      onOpenTopic={(next) => router.replace(`/(app)/community/t/${next}`)}
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
