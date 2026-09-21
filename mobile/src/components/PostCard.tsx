import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SocialPost } from '../api/types';
import { ReactionBar } from './pastoralUi';
import { Avatar, Card } from './ui';
import { colors, spacing } from '../theme';

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
    <Card elevated>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          testID={`post-author-${post.id}`}
          onPress={() => handle && onOpenAuthor?.(handle)}
          disabled={!handle}
          style={styles.authorRow}
        >
          <Avatar name={post.author.displayName} size={40} />
          <View style={styles.authorText}>
            <Text style={styles.author}>{post.author.displayName}</Text>
            {handle ? <Text style={styles.handle}>@{handle}</Text> : null}
          </View>
        </Pressable>
      </View>
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
        <ReactionBar reactionCount={post.reactionCount} commentCount={post.commentCount} />
        {onOpenPost ? <Text style={styles.open}>Abrir publicação</Text> : null}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing[3] },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  authorText: { flex: 1 },
  author: { color: colors.text.primary, fontWeight: '700', fontSize: 16 },
  handle: { color: colors.accent[700], marginTop: 2, fontSize: 13 },
  body: { color: colors.primary[700], fontSize: 16, lineHeight: 23 },
  more: { color: colors.accent[700], fontWeight: '700', marginTop: 8 },
  open: { color: colors.accent[700], fontWeight: '700', marginTop: 8 },
  share: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareKind: { color: colors.accent[700], fontWeight: '700', fontSize: 12, marginBottom: 4 },
  shareTitle: { color: colors.text.primary, fontWeight: '700' },
  shareSubtitle: { color: colors.text.muted, marginTop: 2 },
  shareExcerpt: { color: colors.primary[700], marginTop: 6, lineHeight: 20 },
});
