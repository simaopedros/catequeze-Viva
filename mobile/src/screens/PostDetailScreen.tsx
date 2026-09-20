import React, { useState } from 'react';
import { View } from 'react-native';
import type { SocialAccess, SocialComment, SocialPost, SocialReportReason } from '../api/types';
import { PostCard } from '../components/PostCard';
import {
  AppText,
  Banner,
  BrandButton,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Screen,
  ScreenTitle,
  SectionHeader,
} from '../components/ui';
import { copy } from '../copy/ptBR';
import { spacing } from '../theme';

const REACTIONS = [
  { id: 'AMEM' as const, label: copy.post.reactions.AMEM },
  { id: 'REZO' as const, label: copy.post.reactions.REZO },
  { id: 'ALELUIA' as const, label: copy.post.reactions.ALELUIA },
];

const REPORT_REASONS: { id: SocialReportReason; label: string }[] = [
  { id: 'DOCTRINE', label: copy.post.reportReasons.DOCTRINE },
  { id: 'HATE', label: copy.post.reportReasons.HATE },
  { id: 'SPAM', label: copy.post.reportReasons.SPAM },
  { id: 'OTHER', label: copy.post.reportReasons.OTHER },
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
  reportMessage,
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
  reportMessage?: string | null;
}) {
  const [body, setBody] = useState('');
  const [reason, setReason] = useState<SocialReportReason>('OTHER');

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
        <ErrorState title={copy.post.errorTitle} body={error || copy.post.notFound} />
      </Screen>
    );
  }

  return (
    <Screen testID="post-screen">
      <ScreenTitle
        title={copy.post.title}
        subtitle={post.topics?.map((topic) => topic.name).join(' · ') || copy.community.title}
      />
      <PostCard post={post} onOpenAuthor={onOpenAuthor} />
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        {REACTIONS.map((item) => (
          <Chip
            key={item.id}
            testID={`react-${item.id}`}
            label={item.label}
            active={post.viewerReaction === item.id}
            onPress={() => onReact(item.id)}
          />
        ))}
      </View>
      <SectionHeader title={copy.post.comments} />
      {comments.length === 0 ? (
        <EmptyState title={copy.post.commentsEmptyTitle} body={copy.post.commentsEmptyBody} />
      ) : (
        comments.map((comment) => (
          <View key={comment.id} testID={`comment-${comment.id}`} style={{ marginBottom: spacing.md }}>
            <AppText variant="titleSm">{comment.author.displayName}</AppText>
            {comment.author.handle || comment.author.socialHandle ? (
              <AppText variant="caption" color="goldMuted" style={{ marginBottom: spacing.xxs }}>
                @{comment.author.handle || comment.author.socialHandle}
              </AppText>
            ) : null}
            <AppText variant="bodySm" color="inkSoft">
              {comment.body}
            </AppText>
          </View>
        ))
      )}
      {access && !access.canPublish ? <Banner>{copy.post.commentsNeedAccount}</Banner> : null}
      <Field
        label={copy.post.yourComment}
        placeholder={copy.post.commentPlaceholder}
        value={body}
        onChangeText={setBody}
        multiline
        testID="comment-input"
      />
      <BrandButton
        testID="comment-submit"
        label={busy ? copy.common.sending : copy.post.comment}
        disabled={busy || !body.trim()}
        onPress={async () => {
          await onComment(body.trim());
          setBody('');
        }}
      />
      {onReport ? (
        <View style={{ marginTop: spacing.lg }}>
          <SectionHeader title={copy.post.report} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
            {REPORT_REASONS.map((item) => (
              <Chip
                key={item.id}
                testID={`report-reason-${item.id}`}
                label={item.label}
                active={reason === item.id}
                onPress={() => setReason(item.id)}
              />
            ))}
          </View>
          {reportMessage ? (
            <AppText
              variant="bodySm"
              color={reportMessage.startsWith('Não') ? 'danger' : 'success'}
              style={{ marginBottom: spacing.sm }}
            >
              {reportMessage}
            </AppText>
          ) : null}
          <BrandButton
            variant="ghost"
            testID="report-submit"
            label={busy ? copy.common.sending : copy.post.sendReport}
            disabled={busy}
            onPress={() => onReport(reason)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
