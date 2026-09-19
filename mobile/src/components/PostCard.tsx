import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Menu, Text } from 'react-native-paper';
import type { SocialPost } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { formatRelative } from '../utils/format';
import { Avatar } from './Avatar';
import { PostMedia } from './PostMedia';
import { Card, Icon, Tag } from './ui';

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
      <View style={styles.shareBar} />
      <View style={{ flex: 1 }}>
        {kind ? <Text style={styles.shareKind}>{kind}</Text> : null}
        <Text style={styles.shareTitle}>{title}</Text>
        {subtitle ? <Text style={styles.shareSubtitle}>{subtitle}</Text> : null}
        {excerpt ? <Text style={styles.shareExcerpt}>{excerpt}</Text> : null}
      </View>
    </View>
  );
}

export function PostCard({
  post,
  onOpenAuthor,
  onOpenPost,
  onShare,
  onDelete,
  onReport,
}: {
  post: SocialPost;
  onOpenAuthor?: (handle: string) => void;
  onOpenPost?: (slug: string) => void;
  onShare?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const long = (post.body || '').length > LONG_BODY;
  const body = !long || expanded ? post.body : `${post.body.slice(0, LONG_BODY).trimEnd()}…`;
  const handle = post.author.handle || post.author.socialHandle;
  const createdAt = (post as any).createdAt || (post as any).publishedAt;
  const hasMenu = Boolean(onShare || onDelete || onReport);

  return (
    <Card onPress={onOpenPost && post.slug ? () => onOpenPost(post.slug) : undefined}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          testID={`post-author-${post.id}`}
          onPress={() => handle && onOpenAuthor?.(handle)}
          disabled={!handle}
          style={styles.authorRow}
        >
          <Avatar name={post.author.displayName} url={post.author.avatarUrl} size={40} />
          <View style={styles.authorText}>
            <Text style={styles.author}>{post.author.displayName}</Text>
            <Text style={styles.handle}>
              {handle ? `@${handle}` : ''}
              {handle && createdAt ? ' · ' : ''}
              {createdAt ? formatRelative(createdAt) : ''}
            </Text>
          </View>
        </Pressable>
        {hasMenu ? (
          <Menu
            visible={menuOpen}
            onDismiss={() => setMenuOpen(false)}
            anchor={
              <Pressable testID={`post-menu-${post.id}`} onPress={() => setMenuOpen(true)} style={{ padding: 4 }} accessibilityLabel="Mais opções">
                <Icon name="dots-horizontal" size={22} color={colors.muted} />
              </Pressable>
            }
            contentStyle={{ backgroundColor: colors.surface, borderRadius: radius.md }}
          >
            {onShare ? <Menu.Item leadingIcon="share-variant-outline" title="Partilhar" onPress={() => { setMenuOpen(false); onShare(); }} /> : null}
            {onReport ? <Menu.Item leadingIcon="flag-outline" title="Denunciar" onPress={() => { setMenuOpen(false); onReport(); }} /> : null}
            {onDelete ? <Menu.Item leadingIcon="delete-outline" title="Apagar" titleStyle={{ color: colors.danger }} onPress={() => { setMenuOpen(false); onDelete(); }} /> : null}
          </Menu>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" testID={`post-${post.id}`} onPress={() => post.slug && onOpenPost?.(post.slug)} disabled={!onOpenPost}>
        {post.body ? <Text style={styles.body}>{body}</Text> : null}
      </Pressable>
      <PostMedia media={post.media} />
      {long ? (
        <Pressable onPress={() => setExpanded((value) => !value)} testID={`post-expand-${post.id}`}>
          <Text style={styles.more}>{expanded ? 'Ver menos' : 'Ver mais'}</Text>
        </Pressable>
      ) : null}
      {post.share ? (
        <ShareCard kind={post.share.sourceLabel || post.share.kind} title={post.share.title} subtitle={post.share.subtitle} excerpt={post.share.excerpt} />
      ) : null}
      {post.topics && post.topics.length > 0 ? (
        <View style={styles.topics}>
          {post.topics.slice(0, 3).map((topic) => (
            <Tag key={topic.slug} label={`#${topic.name}`} tone="gold" />
          ))}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir publicação"
        testID={`open-post-${post.id}`}
        onPress={() => post.slug && onOpenPost?.(post.slug)}
        disabled={!onOpenPost}
        style={styles.footer}
      >
        <View style={styles.metaItem}>
          <Icon name="hands-pray" size={16} color={colors.muted} />
          <Text style={styles.meta}>{post.reactionCount ?? 0} reações</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="comment-outline" size={16} color={colors.muted} />
          <Text style={styles.meta}>{post.commentCount ?? 0} comentários</Text>
        </View>
        {onOpenPost ? (
          <View style={[styles.metaItem, { marginLeft: 'auto' }]}>
            <Icon name="chevron-right" size={16} color={colors.goldDark} />
          </View>
        ) : null}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  authorText: { flex: 1 },
  author: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  handle: { color: colors.muted, marginTop: 1, fontSize: 12 },
  body: { color: colors.inkSoft, fontSize: 16, lineHeight: 24, marginTop: spacing.sm },
  more: { color: colors.goldDark, fontWeight: '700', marginTop: 6 },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: colors.muted, fontSize: 13 },
  share: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  shareBar: { width: 3, borderRadius: 2, backgroundColor: colors.gold },
  shareKind: { color: colors.goldDark, fontWeight: '700', fontSize: 11, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.8 },
  shareTitle: { color: colors.ink, fontWeight: '700' },
  shareSubtitle: { color: colors.muted, marginTop: 2, fontSize: 13 },
  shareExcerpt: { color: colors.inkSoft, marginTop: 6, lineHeight: 20, fontStyle: 'italic' },
});
