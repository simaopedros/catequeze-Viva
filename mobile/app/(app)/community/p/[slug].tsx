import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { usePagedList } from '../../../../src/hooks/usePagedList';
import { PostDetailScreen } from '../../../../src/screens/PostDetailScreen';

export default function PostRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const post = useAsync(() => api.socialPost(String(slug || '')), [slug]);
  const postId = post.data?.id;
  const comments = usePagedList(
    (cursor) => (postId ? api.socialComments(postId, cursor) : Promise.resolve({ items: [], nextCursor: null })),
    [postId],
  );
  const access = useAsync(() => api.socialAccess(), []);
  const [busy, setBusy] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <PostDetailScreen
      post={post.data}
      comments={comments.items}
      access={access.data}
      loading={post.loading}
      error={post.error}
      busy={busy}
      actionError={actionError}
      commentsHasMore={Boolean(comments.nextCursor)}
      commentsLoadingMore={comments.loadingMore}
      onLoadMoreComments={() => void comments.loadMore()}
      onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
      onReact={async (type) => {
        if (!post.data?.id) return;
        setBusy(true);
        setActionError(null);
        try {
          await api.toggleReaction(post.data.id, type);
          await post.reload();
        } catch (err) {
          setActionError(err instanceof Error ? err.message : 'Não foi possível registar a reação.');
        } finally {
          setBusy(false);
        }
      }}
      reportMessage={reportMessage}
      onComment={async (body) => {
        if (!post.data?.id) return;
        setBusy(true);
        setActionError(null);
        try {
          await api.createComment(post.data.id, body);
          await Promise.all([post.reload(), comments.reload()]);
        } catch (err) {
          setActionError(err instanceof Error ? err.message : 'Não foi possível enviar o comentário.');
          throw err;
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
