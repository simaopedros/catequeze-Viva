import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { openCommunityArea } from '../../../src/screens/communityNavigation';
import { CommunityScreen } from '../../../src/screens/CommunityScreen';

export default function CommunityRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const [sort, setSort] = useState<'recent' | 'trending' | 'foryou'>('recent');
  const [topicSlug, setTopicSlug] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const feed = useAsync(() => api.socialFeed({ sort, topicSlug, following }), [sort, topicSlug, following]);
  const topics = useAsync(() => api.socialTopics(), []);
  const access = useAsync(() => api.socialAccess(), []);
  const me = useAsync(() => api.mySocialProfile(), []);

  useFocusEffect(
    useCallback(() => {
      if (feed.data) void feed.reload();
    }, [feed.data, feed.reload]),
  );

  return (
    <CommunityScreen
      posts={feed.data?.items ?? []}
      topics={topics.data ?? []}
      access={access.data}
      sort={sort}
      topicSlug={topicSlug}
      following={following}
      loading={feed.loading}
      error={feed.error}
      showHub
      onOpenArea={(area) => openCommunityArea(router, area, me.data?.handle)}
      onChangeSort={setSort}
      onChangeTopic={setTopicSlug}
      onToggleFollowing={() => setFollowing((value) => !value)}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
      onOpenTopic={(slug) => router.push(`/(app)/community/t/${slug}`)}
      onCompose={() => router.push('/(app)/community/compose')}
      onSearch={() => router.push('/(app)/community/search')}
    />
  );
}
