import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SocialPost } from '../api/types';
import { formatRelative, initials } from '../format';
import { colors, radius, spacing, type } from '../theme';
import { Avatar, Card } from './ui';

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

function isVideo(kind?: string | null) {
  return (kind || '').toLowerCase().includes('video');
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
  const when = formatRelative(post.publishedAt || post.createdAt);
  const topic = post.topics?.[0];
  const media = post.media?.find((item) => item.url && !isVideo(item.kind));

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        testID={`post-author-${post.id}`}
        onPress={() => handle && onOpenAuthor?.(handle)}
        disabled={!handle}
        style={styles.authorRow}
      >
        <Avatar name={post.author.displayName || initials(handle || '?')} imageUrl={post.author.avatarUrl} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.author}>{post.author.displayName}</Text>
          <Text style={styles.handle}>
            {handle ? `@${handle}` : ''}
            {handle && when ? ' · ' : ''}
            {when}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        testID={`post-${post.id}`}
        onPress={() => post.slug && onOpenPost?.(post.slug)}
        disabled={!onOpenPost}
      >
        {topic ? (
          <View style={styles.topic}>
            <Text style={styles.topicLabel}>{topic.name}</Text>
          </View>
        ) : null}
        {post.body ? <Text style={styles.body}>{body}</Text> : null}
        {long ? (
          <Pressable onPress={() => setExpanded((value) => !value)} testID={`post-expand-${post.id}`}>
            <Text style={styles.more}>{expanded ? 'Ver menos' : 'Ver mais'}</Text>
          </Pressable>
        ) : null}
        {media?.url ? (
          <Image source={{ uri: media.url }} style={styles.media} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : null}
        {post.share ? (
          <ShareCard
            kind={post.share.sourceLabel || post.share.kind}
            title={post.share.title}
            subtitle={post.share.subtitle}
            excerpt={post.share.excerpt}
          />
        ) : null}
        <Text style={styles.meta}>
          {post.reactionCount ?? 0} reações · {post.commentCount ?? 0} comentários
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  author: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 16 },
  handle: { color: colors.goldDark, marginTop: 2, fontFamily: type.body, fontSize: 13 },
  topic: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cream,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  topicLabel: { color: colors.goldDark, fontFamily: type.bodyBold, fontSize: 12 },
  body: { color: colors.inkSoft, fontFamily: type.body, fontSize: 16, lineHeight: 23 },
  more: { color: colors.goldDark, fontFamily: type.bodyBold, marginTop: 8 },
  media: { width: '100%', height: 180, borderRadius: radius.sm, marginTop: spacing.sm, backgroundColor: colors.line },
  meta: { color: colors.muted, marginTop: spacing.sm, fontSize: 13, fontFamily: type.body },
  share: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  shareKind: { color: colors.goldDark, fontFamily: type.bodyBold, fontSize: 12, marginBottom: 4 },
  shareTitle: { color: colors.ink, fontFamily: type.bodyBold },
  shareSubtitle: { color: colors.muted, marginTop: 2, fontFamily: type.body },
  shareExcerpt: { color: colors.inkSoft, marginTop: 6, lineHeight: 20, fontFamily: type.body },
});
