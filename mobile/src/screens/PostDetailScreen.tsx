import { useNavigation } from 'expo-router';
import { MoreVertical } from 'lucide-react-native';
import React, { useLayoutEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SocialAccess, SocialComment, SocialPost, SocialReportReason } from '../api/types';
import { PostCard } from '../components/PostCard';
import { PostReactionStrip, type PastoralReactionId } from '../components/postReactionsUi';
import { BrandButton, EmptyState, Field, LoadingState, Screen } from '../components/ui';
import { colors, spacing } from '../theme';

const REPORT_REASONS: { id: SocialReportReason; label: string }[] = [
  { id: 'DOCTRINE', label: 'Conteúdo doutrinário inadequado' },
  { id: 'HATE', label: 'Ódio ou ofensa' },
  { id: 'SPAM', label: 'Spam' },
  { id: 'OTHER', label: 'Outro motivo' },
];

function openReportMenu(onReport: (reason: SocialReportReason) => void) {
  Alert.alert('Denunciar publicação', 'Escolha o motivo da denúncia.', [
    ...REPORT_REASONS.map((item) => ({
      text: item.label,
      onPress: () => onReport(item.id),
    })),
    { text: 'Cancelar', style: 'cancel' },
  ]);
}

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
}: {
  post?: SocialPost | null;
  comments: SocialComment[];
  access?: SocialAccess | null;
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
  onOpenAuthor: (handle: string) => void;
  onReact: (type: PastoralReactionId) => void;
  onComment: (body: string) => Promise<void> | void;
  onReport?: (reason: SocialReportReason) => Promise<void> | void;
}) {
  const [body, setBody] = useState('');
  const navigation = useNavigation();

  useLayoutEffect(() => {
    if (!post) return;
    const topicLine = post.topics?.map((topic) => topic.name).filter(Boolean).join(' · ');
    navigation.setOptions({
      title: post.author.displayName || 'Publicação',
      headerRight: onReport
        ? () => (
            <Pressable
              testID="post-menu"
              onPress={() => openReportMenu((reason) => onReport(reason))}
              hitSlop={12}
              style={styles.headerMenu}
              accessibilityRole="button"
              accessibilityLabel="Mais opções"
            >
              <MoreVertical size={22} color={colors.primary[800]} strokeWidth={2.2} />
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, onReport, post]);

  if (loading) {
    return (
      <Screen testID="post-screen">
        <LoadingState />
      </Screen>
    );
  }
  if (error || !post) {
    return (
      <Screen testID="post-screen">
        <EmptyState title="Publicação indisponível" body={error || 'Esta publicação não foi encontrada.'} />
      </Screen>
    );
  }

  const topicLine = post.topics?.map((topic) => topic.name).filter(Boolean).join(' · ');

  return (
    <Screen testID="post-screen">
      {topicLine ? <Text style={styles.topicLine}>{topicLine}</Text> : null}

      <PostCard post={post} onOpenAuthor={onOpenAuthor} variant="detail" />

      <PostReactionStrip
        active={post.viewerReaction ?? null}
        totalCount={post.reactionCount}
        disabled={busy}
        onReact={onReact}
      />

      <Text style={styles.commentsTitle}>
        Comentários{comments.length > 0 ? ` (${comments.length})` : ''}
      </Text>

      {comments.length === 0 ? (
        <Text style={styles.commentsEmpty}>Ainda sem comentários. Partilhe uma palavra de encorajamento.</Text>
      ) : (
        comments.map((comment) => (
          <View key={comment.id} testID={`comment-${comment.id}`} style={styles.comment}>
            <Text style={styles.commentAuthor}>{comment.author.displayName}</Text>
            {comment.author.handle || comment.author.socialHandle ? (
              <Text style={styles.commentHandle}>
                @{comment.author.handle || comment.author.socialHandle}
              </Text>
            ) : null}
            <Text style={styles.commentBody}>{comment.body}</Text>
          </View>
        ))
      )}

      {access && !access.canPublish ? (
        <Text style={styles.commentHint}>
          Comentários pedem a mesma conta com que lê a Comunidade.
        </Text>
      ) : null}

      <Field label="Escrever comentário" value={body} onChangeText={setBody} multiline testID="comment-input" />
      <BrandButton
        testID="comment-submit"
        label={busy ? 'A enviar…' : 'Comentar'}
        disabled={busy || !body.trim()}
        onPress={async () => {
          await onComment(body.trim());
          setBody('');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerMenu: {
    marginRight: spacing[1],
    padding: spacing[1],
  },
  topicLine: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: spacing[3],
  },
  commentsTitle: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 17,
    marginBottom: spacing[2],
  },
  commentsEmpty: {
    color: colors.text.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing[4],
  },
  comment: {
    marginBottom: spacing[3],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  commentAuthor: { color: colors.text.primary, fontWeight: '700', fontSize: 15 },
  commentHandle: { color: colors.accent[700], fontSize: 13, marginBottom: 4 },
  commentBody: { color: colors.primary[700], lineHeight: 22, fontSize: 15 },
  commentHint: { color: colors.accent[700], marginBottom: spacing.sm, fontSize: 13 },
});
