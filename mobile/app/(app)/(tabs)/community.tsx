import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import type { SocialPost } from '../../../src/api/types';
import { feedQueryForTab, type FeedTabId } from '../../../src/lib/social';
import { CommunityScreen } from '../../../src/screens/CommunityScreen';

export default function CommunityRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<FeedTabId>('foryou');
  const [topicSlug, setTopicSlug] = useState<string | null>(null);
  const [items, setItems] = useState<SocialPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const query = useMemo(() => feedQueryForTab(tab), [tab]);
  const feed = useAsync(
    () => api.socialFeed({ ...query, topicSlug, cursor: null, limit: 20 }),
    [query.sort, query.following, query.videoFormat, topicSlug],
  );
  const shortsProbe = useAsync(() => api.socialFeed({ videoFormat: 'SHORT', limit: 1 }), []);
  const topics = useAsync(() => api.socialTopics(), []);
  const access = useAsync(() => api.socialAccess(), []);

  useEffect(() => {
    if (!feed.data) return;
    setItems(feed.data.items);
    setCursor(feed.data.nextCursor);
  }, [feed.data]);

  useFocusEffect(
    useCallback(() => {
      if (feed.data) void feed.reload();
    }, [feed.data, feed.reload]),
  );

  return (
    <CommunityScreen
      posts={items}
      topics={topics.data ?? []}
      access={access.data}
      tab={tab}
      topicSlug={topicSlug}
      loading={feed.loading}
      refreshing={refreshing}
      error={feed.error}
      hasMore={Boolean(cursor)}
      showShorts={Boolean(shortsProbe.data?.items.length)}
      onChangeTab={setTab}
      onChangeTopic={setTopicSlug}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
      onOpenTopic={(slug) => router.push(`/(app)/community/t/${slug}`)}
      onCompose={() => router.push('/(app)/community/compose')}
      onRefresh={async () => {
        setRefreshing(true);
        try {
          await feed.reload();
        } finally {
          setRefreshing(false);
        }
      }}
      onLoadMore={async () => {
        if (!cursor) return;
        const page = await api.socialFeed({ ...query, topicSlug, cursor, limit: 20 });
        setItems((current) => [...current, ...page.items]);
        setCursor(page.nextCursor);
      }}
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
