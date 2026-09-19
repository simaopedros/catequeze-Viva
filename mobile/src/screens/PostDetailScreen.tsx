import React, { useState } from 'react';
import { View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import type { SocialAccess, SocialComment, SocialPost, SocialReportReason } from '../api/types';
import { Avatar } from '../components/Avatar';
import { PostCard } from '../components/PostCard';
import { BrandButton, Card, EmptyState, ErrorText, Field, Row, Screen, SectionHeader, SkeletonList, type IconName } from '../components/ui';
import { colors, spacing } from '../theme';
import { formatRelative } from '../utils/format';

const REACTIONS: { id: 'AMEM' | 'REZO' | 'ALELUIA'; label: string; icon: IconName }[] = [
  { id: 'AMEM', label: 'Amém', icon: 'hands-pray' },
  { id: 'REZO', label: 'Rezo', icon: 'candle' },
  { id: 'ALELUIA', label: 'Aleluia', icon: 'star-four-points-outline' },
];

const REPORT_REASONS: { id: SocialReportReason; label: string }[] = [
  { id: 'DOCTRINE', label: 'Doutrina' },
  { id: 'HATE', label: 'Ódio' },
  { id: 'SPAM', label: 'Spam' },
  { id: 'OTHER', label: 'Outro' },
];

export function PostDetailScreen({
  post,
  comments,
  access,
  loading,
  error,
  busy,
  onOpenAuthor,
  onReact,
  onComment,
  onReport,
  onDeletePost,
  onDeleteComment,
  reportMessage,
  actionError,
  commentsHasMore,
  commentsLoadingMore,
  onLoadMoreComments,
  onSharePost,
  refreshing,
  onRefresh,
}: {
  post?: SocialPost | null;
  comments: SocialComment[];
  access?: SocialAccess | null;
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
  onOpenAuthor: (handle: string) => void;
  onReact: (type: 'AMEM' | 'REZO' | 'ALELUIA') => void;
  onComment: (body: string) => Promise<void> | void;
  onReport?: (reason: SocialReportReason) => Promise<void> | void;
  onDeletePost?: () => void;
  onDeleteComment?: (commentId: string) => void;
  reportMessage?: string | null;
  actionError?: string | null;
  commentsHasMore?: boolean;
  commentsLoadingMore?: boolean;
  onLoadMoreComments?: () => void;
  onSharePost?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const [body, setBody] = useState('');
  const [reason, setReason] = useState<SocialReportReason>('OTHER');
  const [reportOpen, setReportOpen] = useState(false);

  if (loading && !post) {
    return (
      <Screen testID="post-screen">
        <SkeletonList rows={2} />
      </Screen>
    );
  }
  if (error || !post) {
    return (
      <Screen testID="post-screen">
        <EmptyState icon="post-outline" title="Publicação indisponível" body={error || 'Esta publicação não foi encontrada.'} />
      </Screen>
    );
  }

  return (
    <Screen testID="post-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <PostCard post={post} onOpenAuthor={onOpenAuthor} onShare={onSharePost} onDelete={onDeletePost} />
      <Row style={{ flexWrap: 'wrap', marginBottom: spacing.sm }}>
        {REACTIONS.map((item) => {
          const active = post.viewerReaction === item.id;
          return (
            <Chip
              key={item.id}
              testID={`react-${item.id}`}
              icon={item.icon}
              selected={active}
              showSelectedCheck={false}
              mode={active ? 'flat' : 'outlined'}
              onPress={() => onReact(item.id)}
              disabled={busy}
              style={{ backgroundColor: active ? colors.ink : colors.surface, borderColor: colors.line }}
              textStyle={{ color: active ? colors.white : colors.ink }}
              theme={{ colors: { onSurfaceVariant: active ? colors.white : colors.ink } }}
            >
              {item.label}
            </Chip>
          );
        })}
      </Row>

      <SectionHeader title={`Comentários${post.commentCount ? ` (${post.commentCount})` : ''}`} icon="comment-text-outline" />
      {comments.length === 0 ? (
        <EmptyState icon="comment-outline" title="Ainda sem comentários" body="Seja o primeiro a responder com um Amém ou uma palavra." />
      ) : (
        <Card style={{ paddingVertical: spacing.xs }}>
          {comments.map((comment, index) => {
            const handle = comment.author.handle || comment.author.socialHandle;
            return (
              <View key={comment.id} testID={`comment-${comment.id}`} style={{ paddingVertical: spacing.sm, borderBottomWidth: index === comments.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <Avatar name={comment.author.displayName} url={comment.author.avatarUrl} size={32} />
                  <View style={{ flex: 1 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text variant="titleSmall" style={{ color: colors.ink }}>
                        {comment.author.displayName}
                        {handle ? (
                          <Text variant="labelMedium" style={{ color: colors.goldDark }}>
                            {'  '}@{handle}
                          </Text>
                        ) : null}
                      </Text>
                      <Text variant="labelSmall" style={{ color: colors.muted }}>
                        {formatRelative((comment as any).createdAt)}
                      </Text>
                    </Row>
                    <Text variant="bodyMedium" style={{ color: colors.inkSoft, lineHeight: 22, marginTop: 2 }}>
                      {comment.body}
                    </Text>
                    {onDeleteComment && ((comment as any).isOwn || (comment as any).canDelete) ? (
                      <BrandButton variant="text" label="Apagar" onPress={() => onDeleteComment(comment.id)} style={{ alignSelf: 'flex-start', marginTop: 0 }} />
                    ) : null}
                  </View>
                </Row>
              </View>
            );
          })}
        </Card>
      )}
      {commentsHasMore && onLoadMoreComments ? (
        <BrandButton variant="ghost" testID="load-more-comments" label={commentsLoadingMore ? 'A carregar…' : 'Carregar mais comentários'} disabled={commentsLoadingMore} loading={commentsLoadingMore} onPress={onLoadMoreComments} />
      ) : null}

      {access && !access.canPublish ? (
        <Card tone="gold">
          <Text variant="bodySmall" style={{ color: colors.goldDark }}>
            Comentários pedem a mesma conta com que lê a Comunidade.
          </Text>
        </Card>
      ) : null}
      <ErrorText message={actionError} />
      <Field label="O seu comentário" icon="comment-edit-outline" value={body} onChangeText={setBody} multiline testID="comment-input" />
      <BrandButton
        testID="comment-submit"
        icon="send-outline"
        label={busy ? 'A enviar…' : 'Comentar'}
        loading={busy}
        disabled={busy || !body.trim()}
        onPress={async () => {
          try {
            await onComment(body.trim());
            setBody('');
          } catch {
            // o erro é apresentado via actionError; o rascunho fica no campo
          }
        }}
      />

      {onReport ? (
        <View style={{ marginTop: spacing.lg }}>
          {!reportOpen ? (
            <BrandButton variant="text" icon="flag-outline" label="Denunciar publicação" onPress={() => setReportOpen(true)} testID="report-open" />
          ) : (
            <Card>
              <Text variant="titleSmall" style={{ color: colors.ink, marginBottom: spacing.sm }}>
                Denunciar publicação
              </Text>
              <Row style={{ flexWrap: 'wrap', marginBottom: spacing.sm }}>
                {REPORT_REASONS.map((item) => (
                  <Chip
                    key={item.id}
                    testID={`report-reason-${item.id}`}
                    selected={reason === item.id}
                    showSelectedCheck={false}
                    mode={reason === item.id ? 'flat' : 'outlined'}
                    onPress={() => setReason(item.id)}
                    style={{ backgroundColor: reason === item.id ? colors.ink : colors.surface, borderColor: colors.line }}
                    textStyle={{ color: reason === item.id ? colors.white : colors.ink }}
                  >
                    {item.label}
                  </Chip>
                ))}
              </Row>
              {reportMessage ? (
                <Text variant="bodySmall" style={{ color: colors.success, marginBottom: spacing.sm }}>
                  {reportMessage}
                </Text>
              ) : null}
              <Row>
                <BrandButton variant="ghost" label="Cancelar" onPress={() => setReportOpen(false)} style={{ flex: 1 }} />
                <BrandButton variant="danger" testID="report-submit" label={busy ? 'A enviar…' : 'Enviar denúncia'} disabled={busy} onPress={() => onReport(reason)} style={{ flex: 1 }} />
              </Row>
            </Card>
          )}
        </View>
      ) : null}
    </Screen>
  );
}
