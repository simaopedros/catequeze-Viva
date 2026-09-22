import { useNavigation } from 'expo-router';
import { MoreVertical } from 'lucide-react-native';
import React, { useLayoutEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SocialAccess, SocialComment, SocialPost, SocialReportReason } from '../api/types';
import { PostCommentComposer, PostCommentItem } from '../components/postCommentsUi';
import { PostCard } from '../components/PostCard';
import { PostReactionStrip, type PastoralReactionId } from '../components/postReactionsUi';
import { EmptyState, LoadingState, Screen } from '../components/ui';
import { colors, contentHorizontalPadding, spacing } from '../theme';

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
  viewerName,
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
  viewerName?: string;
  onOpenAuthor: (handle: string) => void;
  onReact: (type: PastoralReactionId) => void;
  onComment: (body: string) => Promise<void> | void;
  onReport?: (reason: SocialReportReason) => Promise<void> | void;
}) {
  const [body, setBody] = useState('');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 44 : 0;
  const horizontal = contentHorizontalPadding(width);
  const canComment = !access || access.canPublish;

  useLayoutEffect(() => {
    if (!post) return;
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

  const submitComment = async () => {
    const trimmed = body.trim();
    if (!trimmed || !canComment) return;
    await onComment(trimmed);
    setBody('');
  };

  return (
    <SafeAreaView testID="post-screen" style={styles.root} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontal }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {topicLine ? <Text style={styles.topicLine}>{topicLine}</Text> : null}

          <PostCard post={post} onOpenAuthor={onOpenAuthor} variant="detail" />

          <PostReactionStrip
            active={post.viewerReaction ?? null}
            totalCount={post.reactionCount}
            disabled={busy}
            onReact={onReact}
          />

          <View style={styles.commentsSection} testID="post-comments-section">
            <Text style={styles.commentsTitle}>
              Comentários{comments.length > 0 ? ` · ${comments.length}` : ''}
            </Text>

            {!canComment ? (
              <Text style={styles.commentHint}>
                Use a mesma conta da Comunidade para participar na conversa.
              </Text>
            ) : null}

            {comments.length === 0 ? (
              <Text style={styles.commentsEmpty}>Seja o primeiro a responder.</Text>
            ) : (
              <View style={styles.commentList}>
                {comments.map((comment) => (
                  <PostCommentItem key={comment.id} comment={comment} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={[styles.composerBar, { paddingHorizontal: horizontal }]}>
          <PostCommentComposer
            value={body}
            onChangeText={setBody}
            onSubmit={submitComment}
            busy={busy}
            disabled={!canComment}
            viewerName={viewerName}
            variant="footer"
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  headerMenu: {
    marginRight: spacing[1],
    padding: spacing[1],
  },
  topicLine: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: spacing[3],
  },
  commentsSection: {
    marginTop: spacing[1],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  commentsTitle: {
    color: colors.text.muted,
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing[2],
  },
  commentsEmpty: {
    color: colors.text.muted,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: spacing[2],
  },
  commentList: {
    marginTop: spacing[1],
  },
  commentHint: {
    color: colors.text.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing[3],
  },
  composerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.canvas,
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
});
