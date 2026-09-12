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
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [heldMessage, setHeldMessage] = useState<string | null>(null);

  return (
    <PostDetailScreen
      post={post.data}
      comments={comments.data?.items ?? []}
      access={access.data}
      loading={post.loading}
      error={post.error}
      busy={busy}
      heldMessage={heldMessage}
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
      reportMessage={reportMessage}
      onDelete={async (postId) => {
        await api.deletePost(postId);
        router.replace('/(app)/(tabs)/community');
      }}
      onComment={async (body, parentId) => {
        if (!post.data?.id) return;
        setBusy(true);
        setHeldMessage(null);
        try {
          const result = await api.createComment(post.data.id, body, parentId);
          if (result.held) setHeldMessage('O seu comentário foi enviado para revisão.');
          await Promise.all([post.reload(), comments.reload()]);
        } finally {
          setBusy(false);
        }
      }}
      onReport={async (reason) => {
        if (!post.data?.id) return;
        setBusy(true);
        setReportMessage(null);
        try {
          await api.reportSocial({ targetType: 'POST', targetId: post.data.id, reason });
          setReportMessage('Denúncia enviada. Obrigado.');
        } catch (err) {
          setReportMessage(err instanceof Error ? err.message : 'Não foi possível denunciar.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
