import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { PostDetailScreen } from '../../../../src/screens/PostDetailScreen';

export default function PostRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const post = useAsync(() => api.socialPost(String(slug || '')), [slug]);
  const comments = useAsync(
    () => (post.data?.id ? api.socialComments(post.data.id) : Promise.resolve({ items: [], nextCursor: null })),
    [post.data?.id],
  );
  const access = useAsync(() => api.socialAccess(), []);
  const [busy, setBusy] = useState(false);

  return (
    <PostDetailScreen
      post={post.data}
      comments={comments.data?.items ?? []}
      access={access.data}
      loading={post.loading}
      error={post.error}
      busy={busy}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onReact={async (type) => {
        if (!post.data?.id) return;
        setBusy(true);
        try {
          await api.toggleReaction(post.data.id, type);
          await post.reload();
        } finally {
          setBusy(false);
        }
      }}
      onComment={async (body) => {
        if (!post.data?.id) return;
        setBusy(true);
        try {
          await api.createComment(post.data.id, body);
          await Promise.all([post.reload(), comments.reload()]);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
