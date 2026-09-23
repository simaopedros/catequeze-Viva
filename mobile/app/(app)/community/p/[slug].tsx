import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { displayName, useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { PostDetailScreen } from '../../../../src/screens/PostDetailScreen';

export default function PostRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { api, user } = useAuth();
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
      viewerName={displayName(user)}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onRepost={
        post.data?.slug
          ? () =>
              router.push({
                pathname: '/(app)/(tabs)/community',
                params: { repostSlug: post.data!.slug! },
              })
          : undefined
      }
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
      onReport={async (reason) => {
        if (!post.data?.id) return;
        setBusy(true);
        try {
          await api.reportSocial({ targetType: 'POST', targetId: post.data.id, reason });
          Alert.alert('Denúncia enviada', 'Obrigado por ajudar a cuidar da comunidade.');
        } catch (err) {
          Alert.alert(
            'Não foi possível denunciar',
            err instanceof Error ? err.message : 'Tente novamente mais tarde.',
          );
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
