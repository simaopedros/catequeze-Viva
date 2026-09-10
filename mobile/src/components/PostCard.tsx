import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SocialPost } from '../api/types';
import { colors, spacing } from '../theme';
import { Card } from './ui';

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
      {kind ? <Text style={styles.shareKind}>{kind}</Text> : null}
      <Text style={styles.shareTitle}>{title}</Text>
      {subtitle ? <Text style={styles.shareSubtitle}>{subtitle}</Text> : null}
      {excerpt ? <Text style={styles.shareExcerpt}>{excerpt}</Text> : null}
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
      <Pressable
        accessibilityRole="button"
        testID={`post-author-${post.id}`}
        onPress={() => handle && onOpenAuthor?.(handle)}
        disabled={!handle}
      >
        <Text style={styles.author}>{post.author.displayName}</Text>
        {handle ? <Text style={styles.handle}>@{handle}</Text> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        testID={`post-${post.id}`}
        onPress={() => post.slug && onOpenPost?.(post.slug)}
        disabled={!onOpenPost}
      >
        {post.body ? <Text style={styles.body}>{body}</Text> : null}
      </Pressable>
      {long ? (
        <Pressable onPress={() => setExpanded((value) => !value)} testID={`post-expand-${post.id}`}>
          <Text style={styles.more}>{expanded ? 'Ver menos' : 'Ver mais'}</Text>
        </Pressable>
      ) : null}
      {post.share ? (
        <ShareCard
          kind={post.share.sourceLabel || post.share.kind}
          title={post.share.title}
          subtitle={post.share.subtitle}
          excerpt={post.share.excerpt}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        testID={`open-post-${post.id}`}
        onPress={() => post.slug && onOpenPost?.(post.slug)}
        disabled={!onOpenPost}
      >
        <Text style={styles.meta}>
          {post.reactionCount ?? 0} reações · {post.commentCount ?? 0} comentários
        </Text>
        {onOpenPost ? <Text style={styles.open}>Abrir publicação</Text> : null}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  author: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  handle: { color: colors.goldDark, marginTop: 2, marginBottom: spacing.sm },
  body: { color: colors.inkSoft, fontSize: 16, lineHeight: 23 },
  more: { color: colors.goldDark, fontWeight: '700', marginTop: 8 },
  meta: { color: colors.muted, marginTop: spacing.sm, fontSize: 13 },
  open: { color: colors.goldDark, fontWeight: '700', marginTop: 8 },
  share: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  shareKind: { color: colors.goldDark, fontWeight: '700', fontSize: 12, marginBottom: 4 },
  shareTitle: { color: colors.ink, fontWeight: '700' },
  shareSubtitle: { color: colors.muted, marginTop: 2 },
  shareExcerpt: { color: colors.inkSoft, marginTop: 6, lineHeight: 20 },
});
