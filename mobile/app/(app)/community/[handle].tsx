import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';

export default function ProfileRoute() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.socialProfile(String(handle || '')), [handle]);
  const posts = useAsync(
    () => (data?.id ? api.socialFeed({ authorId: data.id, sort: 'recent' }) : Promise.resolve({ items: [], nextCursor: null })),
    [data?.id],
  );
  const [busy, setBusy] = useState(false);

  return (
    <ProfileScreen
      profile={data}
      posts={posts.data?.items ?? []}
      loading={loading}
      error={error}
      busy={busy}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
      onOpenAuthor={(next) => router.push(`/(app)/community/${next}`)}
      onFollow={async () => {
        if (!data?.id) return;
        setBusy(true);
        try {
          await api.toggleFollow(data.id);
          await reload();
        } finally {
          setBusy(false);
        }
      }}
      onBlock={async () => {
        if (!data?.id) return;
        setBusy(true);
        try {
          await api.toggleBlock(data.id);
          await reload();
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
