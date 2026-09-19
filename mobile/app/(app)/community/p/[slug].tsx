import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../../../src/auth/AuthContext";
import { useAsync } from "../../../../src/hooks/useAsync";
import { usePagedList } from "../../../../src/hooks/usePagedList";
import { usePostActions } from "../../../../src/hooks/usePostActions";
import { useMutation } from "../../../../src/hooks/useMutation";
import { PostDetailScreen } from "../../../../src/screens/PostDetailScreen";

export default function PostRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const post = useAsync(() => api.socialPost(String(slug || "")), [slug]);
  const postId = post.data?.id;
  const comments = usePagedList(
    (cursor) =>
      postId
        ? api.socialComments(postId, cursor)
        : Promise.resolve({ items: [], nextCursor: null }),
    [postId],
  );
  const access = useAsync(() => api.socialAccess(), []);
  const [busy, setBusy] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const postActions = usePostActions(() => router.back());
  const deleteComment = useMutation(
    (commentId: string) => api.deleteSocialComment(commentId),
    {
      successMessage: "Comentário apagado.",
      onSuccess: () => void Promise.all([post.reload(), comments.reload()]),
    },
  );

  // Regista visualização de vídeo (Shorts) quando a publicação tem media de vídeo.
  useEffect(() => {
    const hasVideo = (post.data?.media ?? []).some(
      (item: any) => item.videoUrl || item.kind === "VIDEO",
    );
    if (post.data?.id && hasVideo)
      api.recordSocialWatch(post.data.id).catch(() => undefined);
  }, [post.data?.id]);

  return (
    <>
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
        onSharePost={() => post.data && void postActions.share(post.data)}
        onDeletePost={
          post.data?.isOwn
            ? () => post.data && postActions.requestDelete(post.data)
            : undefined
        }
        onDeleteComment={(commentId) => void deleteComment.run(commentId)}
        refreshing={post.refreshing}
        onRefresh={() => void Promise.all([post.reload(), comments.reload()])}
        onOpenAuthor={(handle) => router.push(`/(app)/community/${handle}`)}
        onReact={async (type) => {
          if (!post.data?.id) return;
          setBusy(true);
          setActionError(null);
          try {
            await api.toggleReaction(post.data.id, type);
            await post.reload();
          } catch (err) {
            setActionError(
              err instanceof Error
                ? err.message
                : "Não foi possível registar a reação.",
            );
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
            setActionError(
              err instanceof Error
                ? err.message
                : "Não foi possível enviar o comentário.",
            );
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
            await api.reportSocial({
              targetType: "POST",
              targetId: post.data.id,
              reason,
            });
            setReportMessage("Denúncia enviada. Obrigado.");
          } catch (err) {
            setReportMessage(
              err instanceof Error
                ? err.message
                : "Não foi possível denunciar.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      {postActions.dialog}
    </>
  );
}
