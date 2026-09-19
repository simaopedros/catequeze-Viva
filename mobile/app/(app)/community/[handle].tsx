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
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'A ação falhou. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProfileScreen
      profile={data}
      posts={posts.data?.items ?? []}
      loading={loading}
      error={error}
      busy={busy}
      actionError={actionError}
      onOpenPost={(slug) => router.push(`/(app)/community/p/${slug}`)}
      onOpenAuthor={(next) => router.push(`/(app)/community/${next}`)}
      onOpenFollowers={() =>
        router.push(`/(app)/community/connections?handle=${encodeURIComponent(profileHandle)}&kind=followers`)
      }
      onOpenFollowing={() =>
        router.push(`/(app)/community/connections?handle=${encodeURIComponent(profileHandle)}&kind=following`)
      }
      onEdit={() => router.push('/(app)/community/edit')}
      onFollow={() => {
        if (!profileId) return;
        void runAction(() => api.toggleFollow(profileId).then(() => undefined));
      }}
      onBlock={() => {
        if (!profileId) return;
        void runAction(() => api.toggleBlock(profileId).then(() => undefined));
      }}
    />
  );
}
