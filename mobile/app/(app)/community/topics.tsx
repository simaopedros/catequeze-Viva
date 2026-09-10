import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { TopicsDirectoryScreen } from '../../../src/screens/TopicsDirectoryScreen';

export default function TopicsRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const pulse = useAsync(() => api.socialPulse(6), []);
  const topics = useAsync(() => api.socialTopics(), []);
  const counted = new Map((pulse.data?.topics ?? []).map((topic) => [topic.slug, topic.postCount]));
  const items = (topics.data ?? []).map((topic) => ({
    ...topic,
    postCount: counted.get(topic.slug) ?? topic.postCount,
  }));

  return (
    <TopicsDirectoryScreen
      topics={items}
      loading={topics.loading}
      error={topics.error || pulse.error}
      onOpenTopic={(slug) => router.push(`/(app)/community/t/${slug}`)}
    />
  );
}
