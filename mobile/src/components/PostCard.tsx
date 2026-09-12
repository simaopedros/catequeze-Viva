import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SocialPost } from '../api/types';
import { Avatar } from './ui';
import { colors, fonts, spacing } from '../theme';

const LONG_BODY = 280;

export function ShareCard({
  title,
  subtitle,
  excerpt,
  kind,
  ink = false,
}: {
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  kind?: string | null;
  ink?: boolean;
}) {
  return (
    <View style={[styles.share, ink && styles.shareInk]} testID="share-card">
      {kind ? <Text style={[styles.shareKind, ink && { color: colors.gold }]}>{kind}</Text> : null}
      <Text style={[styles.shareTitle, ink && { color: colors.cream }]}>{title}</Text>
      {subtitle ? <Text style={styles.shareSubtitle}>{subtitle}</Text> : null}
      {excerpt ? (
        <Text style={[styles.shareExcerpt, ink && { color: colors.cream }]}>{excerpt}</Text>
      ) : null}
    </View>
  );
}

export function PostCard({
  post,
  onOpenAuthor,
  onOpenPost,
  onReact,
}: {
  post: SocialPost;
  onOpenAuthor?: (handle: string) => void;
  onOpenPost?: (slug: string) => void;
  onReact?: (type: 'AMEM' | 'REZO' | 'ALELUIA') => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const long = (post.body || '').length > LONG_BODY;
  const body = !long || expanded ? post.body : `${post.body.slice(0, LONG_BODY).trimEnd()}…`;
  const handle = post.author.handle || post.author.socialHandle;
  const image = post.media?.find((item) => item.kind === 'IMAGE' || item.url)?.url;
  const video = post.media?.find((item) => item.kind === 'VIDEO');

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        testID={`post-author-${post.id}`}
        onPress={() => handle && onOpenAuthor?.(handle)}
        disabled={!handle}
        style={styles.authorRow}
      >
        <Avatar name={post.author.displayName} uri={post.author.avatarUrl} size={40} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.author}>{post.author.displayName}</Text>
          {handle ? <Text style={styles.handle}>@{handle}</Text> : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        testID={`post-${post.id}`}
        onPress={() => post.slug && onOpenPost?.(post.slug)}
        disabled={!onOpenPost}
      >
        {post.body ? <Text style={styles.body}>{body}</Text> : null}
        {image ? <Image source={{ uri: image }} style={styles.image} /> : null}
        {video?.url && !image ? <Text style={styles.more}>Vídeo</Text> : null}
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
      <View style={styles.reactions}>
        <Pressable
          testID={`react-AMEM-${post.id}`}
          onPress={() => onReact?.('AMEM')}
          style={[styles.react, post.viewerReaction === 'AMEM' && styles.reactOn]}
        >
          <Text style={[styles.reactLabel, post.viewerReaction === 'AMEM' && { color: colors.white }]}>Amém</Text>
        </Pressable>
        <Pressable
          testID={`react-REZO-${post.id}`}
          onPress={() => onReact?.('REZO')}
          style={[styles.react, post.viewerReaction === 'REZO' && styles.reactOn]}
        >
          <Text style={[styles.reactLabel, post.viewerReaction === 'REZO' && { color: colors.white }]}>Rezo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          testID={`open-post-${post.id}`}
          onPress={() => post.slug && onOpenPost?.(post.slug)}
          disabled={!onOpenPost}
        >
          <Text style={styles.meta}>
            {post.reactionCount ?? 0} · {post.commentCount ?? 0} comentários
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  author: { color: colors.ink, fontFamily: fonts.sansBold, fontSize: 16 },
  handle: { color: colors.goldDark, marginTop: 2, fontFamily: fonts.sansMedium },
  body: { color: colors.inkSoft, fontSize: 16, lineHeight: 23, fontFamily: fonts.sans },
  more: { color: colors.goldDark, fontFamily: fonts.sansBold, marginTop: 8 },
  meta: { color: colors.muted, fontSize: 13, fontFamily: fonts.sansMedium },
  image: { width: '100%', height: 220, borderRadius: 16, marginTop: 10, backgroundColor: colors.canvas },
  share: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  shareInk: { backgroundColor: colors.ink, borderColor: colors.inkSoft },
  shareKind: { color: colors.goldDark, fontFamily: fonts.sansBold, fontSize: 12, marginBottom: 4 },
  shareTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18 },
  shareSubtitle: { color: colors.muted, marginTop: 2 },
  shareExcerpt: { color: colors.inkSoft, marginTop: 6, lineHeight: 20, fontFamily: fonts.serifRegular },
  reactions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  react: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  reactOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  reactLabel: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
});
