import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SocialPost } from '../api/types';
import { formatPostTimeAgo, postScopeMeta } from './communityUi';
import { Avatar } from './ui';
import { colors, radius, spacing } from '../theme';

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
  const meta = `${postScopeMeta(post)} • ${formatPostTimeAgo(post.publishedAt || post.createdAt)}`;
  const images = (post.media ?? []).filter((m) => m.url && (m.kind === 'IMAGE' || !m.kind));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          testID={`post-author-${post.id}`}
          onPress={() => handle && onOpenAuthor?.(handle)}
          disabled={!handle}
          style={styles.authorRow}
        >
          <Avatar name={post.author.displayName} size={44} />
          <View style={styles.authorText}>
            <Text style={styles.author}>{post.author.displayName}</Text>
            <Text style={styles.meta}>{meta}</Text>
          </View>
        </Pressable>
        <MoreHorizontal size={20} color={colors.text.placeholder} />
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

      {images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
          {images.map((item) => (
            <Image key={item.id} source={{ uri: item.url! }} style={styles.mediaImage} resizeMode="cover" />
          ))}
        </ScrollView>
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
        style={styles.footer}
      >
        <Text style={styles.reactionSummary}>
          {(post.reactionCount ?? 0) > 0 ? `🙏 ❤️ ${post.reactionCount}` : ''}
        </Text>
        <View style={styles.footerActions}>
          <View style={styles.footerStat}>
            <Heart size={18} color={colors.text.muted} />
            <Text style={styles.footerStatText}>{post.reactionCount ?? 0}</Text>
          </View>
          <View style={styles.footerStat}>
            <MessageCircle size={18} color={colors.text.muted} />
            <Text style={styles.footerStatText}>{post.commentCount ?? 0}</Text>
          </View>
          <MoreHorizontal size={18} color={colors.text.placeholder} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  authorText: { flex: 1, minWidth: 0 },
  author: { color: colors.text.primary, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.text.muted, fontSize: 13, marginTop: 2 },
  body: { color: colors.text.primary, fontSize: 15, lineHeight: 22 },
  more: { color: colors.primary[700], fontWeight: '700', marginTop: 8 },
  mediaRow: { marginTop: spacing[3], marginHorizontal: -spacing[1] },
  mediaImage: {
    width: 280,
    height: 160,
    borderRadius: radius.md,
    marginRight: spacing[2],
    backgroundColor: colors.skeleton,
  },
  footer: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reactionSummary: { fontSize: 13, color: colors.text.muted, marginBottom: spacing[2] },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStatText: { color: colors.text.muted, fontWeight: '600', fontSize: 13 },
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
