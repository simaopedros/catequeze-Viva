import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SocialPost } from '../api/types';
import { copy } from '../copy/ptBR';
import { colors, radius, spacing } from '../theme';
import { AppText, Card, PressableScale, TextButton } from './ui';

const LONG_BODY = 280;

export function ShareCard({
  title,
  subtitle,
  excerpt,
  kind,
}: {
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  kind?: string | null;
}) {
  return (
    <View style={styles.share} testID="share-card">
      {kind ? (
        <AppText variant="overline" color="goldMuted" style={{ marginBottom: spacing.xxs }}>
          {kind}
        </AppText>
      ) : null}
      <AppText variant="titleSm">{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" color="secondary" style={{ marginTop: spacing.xxs }}>
          {subtitle}
        </AppText>
      ) : null}
      {excerpt ? (
        <AppText variant="bodySm" color="inkSoft" style={{ marginTop: spacing.xs }}>
          {excerpt}
        </AppText>
      ) : null}
    </View>
  );
}

export function PostCard({
  post,
  onOpenAuthor,
  onOpenPost,
}: {
  post: SocialPost;
  onOpenAuthor?: (handle: string) => void;
  onOpenPost?: (slug: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = (post.body || '').length > LONG_BODY;
  const body = !long || expanded ? post.body : `${post.body.slice(0, LONG_BODY).trimEnd()}…`;
  const handle = post.author.handle || post.author.socialHandle;

  return (
    <Card>
      <PressableScale
        accessibilityRole="button"
        testID={`post-author-${post.id}`}
        onPress={() => handle && onOpenAuthor?.(handle)}
        disabled={!handle}
        haptic={Boolean(handle)}
      >
        <AppText variant="titleSm">{post.author.displayName}</AppText>
        {handle ? (
          <AppText variant="caption" color="goldMuted" style={{ marginTop: 2, marginBottom: spacing.xs }}>
            @{handle}
          </AppText>
        ) : null}
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        testID={`post-${post.id}`}
        onPress={() => post.slug && onOpenPost?.(post.slug)}
        disabled={!onOpenPost}
        haptic={Boolean(onOpenPost)}
      >
        {post.body ? (
          <AppText variant="body" color="inkSoft">
            {body}
          </AppText>
        ) : null}
      </PressableScale>
      {long ? (
        <TextButton
          testID={`post-expand-${post.id}`}
          label={expanded ? copy.post.less : copy.post.more}
          onPress={() => setExpanded((value) => !value)}
        />
      ) : null}
      {post.share ? (
        <ShareCard
          kind={post.share.sourceLabel || post.share.kind}
          title={post.share.title}
          subtitle={post.share.subtitle}
          excerpt={post.share.excerpt}
        />
      ) : null}
      <PressableScale
        accessibilityRole="button"
        testID={`open-post-${post.id}`}
        onPress={() => post.slug && onOpenPost?.(post.slug)}
        disabled={!onOpenPost}
        haptic={Boolean(onOpenPost)}
      >
        <AppText variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
          {copy.post.meta(post.reactionCount ?? 0, post.commentCount ?? 0)}
        </AppText>
        {onOpenPost ? (
          <AppText variant="caption" weight="bold" color="goldMuted" style={{ marginTop: spacing.xs }}>
            {copy.post.open}
          </AppText>
        ) : null}
      </PressableScale>
    </Card>
  );
}

const styles = StyleSheet.create({
  share: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
});
