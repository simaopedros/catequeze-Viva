import { Heart, MessageCircle, MoreHorizontal, Repeat2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PostMediaGallery } from './PostMediaGallery';
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
  onRepost,
  mediaBaseUrl,
  variant = 'feed',
}: {
  post: SocialPost;
  onOpenAuthor?: (handle: string) => void;
  onOpenPost?: (slug: string) => void;
  onRepost?: () => void;
  mediaBaseUrl?: string;
  /** No feed mostra atalhos; no detalhe o conteúdo fica limpo. */
  variant?: 'feed' | 'detail';
}) {
  const isDetail = variant === 'detail';
  const [expanded, setExpanded] = useState(false);
  const long = (post.body || '').length > LONG_BODY;
  const body = !long || expanded ? post.body : `${post.body.slice(0, LONG_BODY).trimEnd()}…`;
  const handle = post.author.handle || post.author.socialHandle;
  const meta = `${postScopeMeta(post)} • ${formatPostTimeAgo(post.publishedAt || post.createdAt)}`;
  const media = post.media ?? [];

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
        {!isDetail ? <MoreHorizontal size={20} color={colors.text.placeholder} /> : null}
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

      {media.length > 0 ? <PostMediaGallery media={media} baseUrl={mediaBaseUrl} /> : null}

      {post.share ? (
        <ShareCard
          kind={post.share.sourceLabel || post.share.kind}
          title={post.share.title}
          subtitle={post.share.subtitle}
          excerpt={post.share.excerpt}
        />
      ) : null}

      {!isDetail ? (
        <Pressable
          accessibilityRole="button"
          testID={`open-post-${post.id}`}
          onPress={() => post.slug && onOpenPost?.(post.slug)}
          disabled={!onOpenPost}
          style={styles.footer}
        >
          <Text style={styles.reactionSummary}>
            {(post.reactionCount ?? 0) > 0 ? `🙏 ${post.reactionCount} reações` : ''}
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
            {onRepost ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Republicar"
                testID={`repost-${post.id}`}
                onPress={onRepost}
                style={styles.footerStat}
              >
                <Repeat2 size={18} color={colors.primary[800]} />
              </Pressable>
            ) : (
              <MoreHorizontal size={18} color={colors.text.placeholder} />
            )}
          </View>
        </Pressable>
      ) : null}
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
