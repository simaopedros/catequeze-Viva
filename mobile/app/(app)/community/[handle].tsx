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
  const profileId = data?.id || data?.profile?.id;
  const profileHandle = data?.handle || data?.socialHandle || data?.profile?.handle || String(handle || '');
  const posts = useAsync(
    () =>
      profileId
        ? api.socialFeed({ authorId: profileId, sort: 'recent' })
        : Promise.resolve({ items: [], nextCursor: null }),
    [profileId],
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
      onOpenFollowers={() =>
        router.push(`/(app)/community/connections?handle=${encodeURIComponent(profileHandle)}&kind=followers`)
      }
      onOpenFollowing={() =>
        router.push(`/(app)/community/connections?handle=${encodeURIComponent(profileHandle)}&kind=following`)
      }
      onEdit={() => router.push('/(app)/community/edit')}
      onFollow={async () => {
        if (!profileId) return;
        setBusy(true);
        try {
          await api.toggleFollow(profileId);
          await reload();
        } finally {
          setBusy(false);
        }
      }}
      onBlock={async () => {
        if (!profileId) return;
        setBusy(true);
        try {
          await api.toggleBlock(profileId);
          await reload();
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
