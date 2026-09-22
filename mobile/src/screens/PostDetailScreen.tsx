import { useNavigation } from 'expo-router';
import { MoreVertical, Repeat2 } from 'lucide-react-native';
import React, { useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SocialAccess, SocialComment, SocialPost, SocialReportReason } from '../api/types';
import { PostCommentComposer, PostCommentItem } from '../components/postCommentsUi';
import { PostCard } from '../components/PostCard';
import { PostReactionStrip, type PastoralReactionId } from '../components/postReactionsUi';
import { ReportSheet } from '../components/ReportSheet';
import { EmptyState, LoadingState, Screen } from '../components/ui';
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';
import { colors, contentHorizontalPadding, radius, spacing } from '../theme';

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
  onRepost,
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
  onRepost?: () => void;
}) {
  const [body, setBody] = useState('');
  const [reportVisible, setReportVisible] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [composerHeight, setComposerHeight] = useState(72);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const { width } = useWindowDimensions();
  const horizontal = contentHorizontalPadding(width);
  const canComment = !access || access.canPublish;
  const keyboardOpen = keyboardOffset > 0;
  const scrollBottomInset = composerHeight + spacing[4] + (keyboardOpen ? keyboardOffset : insets.bottom);

  useLayoutEffect(() => {
    if (!post) return;
    navigation.setOptions({
      title: post.author.displayName || 'Publicação',
      headerRight: onReport
        ? () => (
            <Pressable
              testID="post-menu"
              onPress={() => setReportVisible(true)}
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
      <View style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontal, paddingBottom: scrollBottomInset },
          ]}
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

          {onRepost ? (
            <Pressable
              testID="post-repost"
              onPress={onRepost}
              style={styles.repostButton}
              accessibilityRole="button"
              accessibilityLabel="Republicar na comunidade"
            >
              <Repeat2 size={18} color={colors.primary[800]} strokeWidth={2.2} />
              <Text style={styles.repostLabel}>Republicar</Text>
            </Pressable>
          ) : null}

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

        <View
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            if (next > 0 && Math.abs(next - composerHeight) > 1) {
              setComposerHeight(next);
            }
          }}
          style={[
            styles.composerBar,
            {
              paddingHorizontal: horizontal,
              paddingBottom: keyboardOpen ? spacing[2] : Math.max(insets.bottom, spacing[2]),
              bottom: keyboardOffset,
            },
          ]}
        >
          <PostCommentComposer
            value={body}
            onChangeText={setBody}
            onSubmit={submitComment}
            busy={busy}
            disabled={!canComment}
            viewerName={viewerName}
            variant="footer"
          />
        </View>
      </View>
      {onReport ? (
        <ReportSheet
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          busy={reportBusy}
          onSubmit={async (reason) => {
            setReportBusy(true);
            try {
              await onReport(reason);
              setReportVisible(false);
            } finally {
              setReportBusy(false);
            }
          }}
        />
      ) : null}
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
  repostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
    marginTop: spacing[2],
    marginBottom: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.border,
  },
  repostLabel: {
    color: colors.primary[800],
    fontWeight: '600',
    fontSize: 14,
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
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.canvas,
    paddingTop: spacing[2],
  },
});
